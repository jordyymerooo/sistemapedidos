<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Shift;
use App\Models\Order;
use App\Models\AuditLog;

class ShiftController extends Controller
{
    // Obtener turno actual si lo hay
    public function current()
    {
        $shift = Shift::where('status', 'open')->orderBy('id', 'desc')->first();
        if (!$shift) {
            return response()->json(null);
        }
        return response()->json($shift);
    }

    // Iniciar nueva jornada
    public function start(Request $request)
    {
        $active = Shift::where('status', 'open')->first();
        if ($active) {
            return response()->json(['message' => 'Ya hay una jornada abierta'], 400);
        }

        $shift = Shift::create([
            'start_time' => now()->toDateTimeString(),
            'status' => 'open'
        ]);

        AuditLog::record('shift_start', null, 'shift', $shift->id, [
            'start_time' => $shift->start_time
        ]);

        return response()->json($shift, 201);
    }

    // Finalizar jornada actual
    public function end(Request $request)
    {
        $shifts = Shift::where('status', 'open')->get();
        if ($shifts->isEmpty()) {
            return response()->json(['message' => 'No hay jornada abierta para cerrar'], 400);
        }

        foreach ($shifts as $shift) {
            $shift->update([
                'end_time' => now()->toDateTimeString(),
                'status' => 'closed'
            ]);

            AuditLog::record('shift_end', null, 'shift', $shift->id, [
                'end_time' => $shift->end_time,
                'duration_hours' => round(now()->diffInMinutes($shift->start_time) / 60, 2)
            ]);
        }

        return response()->json(['message' => 'Jornada(s) finalizada(s) correctamente']);
    }

    // Obtener historial completo (para Admin)
    public function index()
    {
        $shifts = Shift::orderBy('start_time', 'desc')->get();
        return response()->json($shifts);
    }

    /**
     * Resumen detallado de una jornada (para Cuadre de Caja y Reporte de Cierre).
     */
    public function summary($id)
    {
        $shift = Shift::findOrFail($id);

        // Calcular ingresos: órdenes pagadas durante esta jornada
        $startTime = $shift->start_time;
        $endTime   = $shift->end_time ?? now()->toDateTimeString();

        $orders = Order::where('status', 'pagado')
            ->whereBetween('updated_at', [$startTime, $endTime])
            ->with('details.product', 'table')
            ->get();

        $totalRevenue = $orders->sum('total');
        $totalOrders  = $orders->count();

        // Mesas únicas atendidas
        $tablesServed = $orders->pluck('table_id')->unique()->count();

        // Top 5 productos vendidos
        $productCounts = [];
        foreach ($orders as $order) {
            foreach ($order->details as $detail) {
                $name = $detail->product?->name ?? 'Desconocido';
                if (!isset($productCounts[$name])) {
                    $productCounts[$name] = ['name' => $name, 'quantity' => 0, 'revenue' => 0];
                }
                $productCounts[$name]['quantity'] += $detail->quantity;
                $productCounts[$name]['revenue']  += $detail->subtotal;
            }
        }

        usort($productCounts, fn($a, $b) => $b['quantity'] - $a['quantity']);
        $topProducts = array_slice(array_values($productCounts), 0, 5);

        return response()->json([
            'shift'         => $shift,
            'total_revenue' => round($totalRevenue, 2),
            'total_orders'  => $totalOrders,
            'tables_served' => $tablesServed,
            'top_products'  => $topProducts,
        ]);
    }
}
