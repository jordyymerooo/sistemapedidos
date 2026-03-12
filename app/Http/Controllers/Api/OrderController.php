<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Return all orders with related info for Admin monitoring
     */
    public function index()
    {
        $orders = Order::with(['details.product', 'table', 'user'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($orders);
    }

    /**
     * Return pending or in-preparation orders to display in Kitchen view
     */
    public function pending()
    {
        $orders = Order::with(['details.product', 'table', 'user'])
            ->whereIn('status', ['pendiente', 'en_preparacion'])
            ->get();

        return response()->json($orders);
    }

    /**
     * Store a newly created order.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'table_id' => 'required|exists:tables,id',
            'user_id' => 'required|exists:users,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            $order = Order::where('table_id', $validated['table_id'])
                ->whereIn('status', ['pendiente', 'en_preparacion', 'servido'])
                ->first();

            if ($order) {
                // Reabrir a cocina y registrar items adicionales, adjudicando al mesero actual
                $order->update([
                    'status' => 'pendiente',
                    'user_id' => $validated['user_id']
                ]);
            } else {
                // Nueva orden
                $order = Order::create([
                    'user_id' => $validated['user_id'],
                    'table_id' => $validated['table_id'],
                    'status' => 'pendiente',
                    'total' => 0,
                ]);
            }

            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);
                
                $subtotal = $product->price * $item['quantity'];

                $order->details()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'subtotal' => $subtotal,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            // Recalcular total completo sumando todos los detalles
            $nuevoTotal = $order->details()->sum('subtotal');
            $order->update(['total' => $nuevoTotal]);

            Table::where('id', $validated['table_id'])->update(['status' => 'ocupada']);

            DB::commit();

            // Aquí se emitiría el evento de Reverb/Pusher:
            // broadcast(new OrderCreated($order))->toOthers();

            return response()->json([
                'message' => 'Pedido enviado a cocina exitosamente.',
                'order' => $order->load(['details.product', 'table'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'No se pudo crear el pedido.', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Mark an order as ready in Kitchen view
     */
    public function markAsReady($id)
    {
        $order = Order::findOrFail($id);

        if ($order->status !== 'pendiente' && $order->status !== 'en_preparacion') {
            return response()->json(['error' => 'Estado de pedido no válido para esta acción'], 400);
        }

        $order->update(['status' => 'servido']);

        // Aquí enviaríamos notificación al cajero/mesero:
        // broadcast(new OrderReady($order))->toOthers();

        return response()->json(['message' => 'Pedido listo para entregar', 'order' => $order]);
    }

    /**
     * Return orders that are ready and waiting to be paid
     */
    public function served()
    {
        $orders = Order::with(['details.product', 'table', 'user'])
            ->where('status', 'servido')
            ->get();

        return response()->json($orders);
    }

    /**
     * Mark an order or a specific part of it as paid 
     */
    public function pay(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $order = Order::with('details')->findOrFail($id);

            // Validar que se envíe un array opcional de items a pagar
            $validated = $request->validate([
                'detail_ids' => 'sometimes|array',
                'detail_ids.*' => 'exists:order_details,id'
            ]);

            $detailIds = $validated['detail_ids'] ?? null;

            // Si no se especifican IDs, pagamos toda la orden (comportamiento legacy/por defecto)
            if (empty($detailIds)) {
                $order->update(['status' => 'pagado']);
                
                // Actualizar todos los detalles a pagado si tuviéramos ese field,
                // como no tenemos field status en el order_detail, la order manda.
                Table::where('id', $order->table_id)->update([
                    'status' => 'libre',
                    'needs_cleaning' => true
                ]);
                $message = 'Cobro total exitoso. Mesa liberada.';
            } else {
                // Cobro Parcial: Si envían items específicos.
                // Idealmente necesitaríamos el status a nivel de `order_details`. 
                // Para esto enviaremos un campo flag en la resp a nivel Frontend para ocultar el cobrado.
                // Como workaround rápido sin migración nueva, dividiremos la orden (Split Check).

                $totalParcial = 0;
                $detailsACobrar = $order->details->whereIn('id', $detailIds);

                foreach ($detailsACobrar as $detail) {
                    $totalParcial += $detail->subtotal;
                    // Se podría eliminar el detalle original pagado si queremos que desaparezca 
                    // o marcar con status 'pagado' si agregamos una columna status en order_details
                }

                // Generamos una orden "hija" que quede documentada como cobrada hoy
                $splitOrder = Order::create([
                    'user_id' => $order->user_id,
                    'table_id' => $order->table_id,
                    'status' => 'pagado',
                    'total' => $totalParcial,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Movemos los detalles a la nueva orden pagada y re-calculamos padre
                foreach ($detailsACobrar as $detail) {
                    $detail->update(['order_id' => $splitOrder->id]);
                }

                // Recalcular total de la orden original
                $order->refresh();
                $nuevoTotal = $order->details->sum('subtotal');
                
                if ($order->details->count() === 0) {
                    // Si se cobraron todos por separado en este último batch, cerrar padre
                    $order->update(['status' => 'pagado', 'total' => 0]);
                    Table::where('id', $order->table_id)->update([
                        'status' => 'libre',
                        'needs_cleaning' => true
                    ]);
                    $message = 'Cobro final exitoso. Mesa liberada.';
                } else {
                    $order->update(['total' => $nuevoTotal]);
                    $message = 'Cobro parcial exitoso. Mesa aún ocupada por el resto del pedido.';
                }
            }

            DB::commit();

            return response()->json(['message' => $message, 'order' => $order]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al procesar el pago.', 'details' => $e->getMessage()], 500);
        }
    }
}
