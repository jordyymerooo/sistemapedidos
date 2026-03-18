<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Table;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Return all orders with related info for Admin monitoring
     */
    public function index()
    {
        $orders = Order::with(['details.product', 'table.location', 'user'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($orders);
    }

    /**
     * Return pending or in-preparation orders to display in Kitchen view
     */
    public function pending()
    {
        $orders = Order::with(['details' => function ($query) {
                $query->whereIn('status', ['pendiente', 'en_preparacion'])->with('product');
            }, 'table.location', 'user'])
            ->whereIn('status', ['pendiente', 'en_preparacion'])
            ->orderBy('created_at', 'asc')
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

            $wasNew  = $order->wasRecentlyCreated;
            $orderId = $order->id;

            DB::commit();

            // Audit FUERA de la transacción para evitar rollbacks
            if ($wasNew) {
                AuditLog::record('order_created', $validated['user_id'], 'order', $orderId, [
                    'table_id'   => $validated['table_id'],
                    'items_count'=> count($validated['items'])
                ]);
            } else {
                AuditLog::record('order_items_added', $validated['user_id'], 'order', $orderId, [
                    'items_added' => array_map(fn($i) => 'prod#' . $i['product_id'] . 'x' . $i['quantity'], $validated['items'])
                ]);
            }

            return response()->json([
                'message' => 'Pedido enviado a cocina exitosamente.',
                'order'   => $order->load(['details.product', 'table.location'])
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

        $order->details()->whereIn('status', ['pendiente', 'en_preparacion'])->update(['status' => 'listo']);
        $order->update(['status' => 'listo']);

        AuditLog::record('order_ready', null, 'order', $order->id, [
            'table_id' => $order->table_id
        ]);

        return response()->json(['message' => 'Pedido en barra. Avisando a mesero.', 'order' => $order->load(['details.product', 'table.location'])]);
    }

    /**
     * Return recently finished orders (last 3 minutes) as ephemeral notifications for waiters
     */
    public function ready()
    {
        // Traer órdenes terminadas que aún no han sido entregadas ('listo')
        $orders = Order::with(['details.product', 'table.location', 'user'])
            ->where('status', 'listo')
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($orders);
    }

    /**
     * Waiter marks an order as DELIVERED to the table
     */
    public function deliver($id)
    {
        $order = Order::findOrFail($id);

        if ($order->status !== 'listo') {
            return response()->json(['error' => 'Solo se pueden entregar a la mesa pedidos que ya estén listos'], 400);
        }

        $order->details()->where('status', 'listo')->update(['status' => 'servido']);
        $order->update(['status' => 'servido']);

        AuditLog::record('order_delivered', null, 'order', $order->id, [
            'table_id' => $order->table_id
        ]);

        return response()->json(['message' => 'Pedido entregado en la mesa correctamente.', 'order' => $order]);
    }

    /**
     * Return orders that are active and not fully paid
     */
    public function served()
    {
        // En lugar de solo 'servido', la CAJA ahora verá todas las órdenes activas
        // Esto permite cobros anticipados (Fast Food) o post-consumo, y da métricas reales.
        $orders = Order::with(['details.product', 'table.location', 'user'])
            ->whereIn('status', ['pendiente', 'en_preparacion', 'listo', 'servido'])
            ->orderBy('id', 'asc') // Las más antiguas primero
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

            // Registrar cobro en audit trail con más detalle
            $amount = isset($totalParcial) ? $totalParcial : $order->total;
            AuditLog::record('order_paid', null, 'order', $order->id, [
                'amount'     => round($amount, 2),
                'is_partial' => !empty($detailIds),
                'message'    => $message,
            ]);

            return response()->json(['message' => $message, 'order' => $order]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error al procesar el pago.', 'details' => $e->getMessage()], 500);
        }
    }
}
