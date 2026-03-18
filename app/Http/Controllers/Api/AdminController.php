<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Table;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Shift;

class AdminController extends Controller
{
    /**
     * Obtiene métricas en tiempo real para el Panel de Administración.
     */
    public function metrics()
    {
        // 1. Obtener jornada activa para filtrar
        $currentShift = Shift::where('status', 'open')->orderBy('id', 'desc')->first();
        
        // 2. Métricas de Mesas (Estas siempre se muestran)
        $tables = Table::all();
        $totalTables = $tables->count();
        $occupiedTables = $tables->where('status', 'ocupada')->count();
        $freeTables = $tables->where('status', 'libre')->count();

        // Si no hay jornada activa, los ingresos y órdenes deben estar en 0 (requerimiento de usuario)
        if (!$currentShift) {
            return response()->json([
                'tables' => [
                    'total' => $totalTables,
                    'occupied' => $occupiedTables,
                    'free' => $freeTables,
                    'data' => $tables
                ],
                'orders' => [
                    'total_today' => 0,
                    'pending' => 0,
                    'served' => 0,
                    'paid' => 0
                ],
                'revenue' => [
                    'today' => 0
                ],
                'top_products' => []
            ]);
        }

        // 3. Filtrar órdenes por el rango de la jornada laboral actual
        $startTime = $currentShift->start_time;
        // Si sigue abierta, usamos 'now' como límite superior
        $endTime = now()->toDateTimeString();

        $shiftOrders = Order::whereBetween('created_at', [$startTime, $endTime])->get();
        
        $totalOrders = $shiftOrders->count();
        $pendingOrders = $shiftOrders->whereIn('status', ['pendiente', 'en_preparacion'])->count();
        $servedOrders = $shiftOrders->where('status', 'servido')->count();
        $paidOrders = $shiftOrders->where('status', 'pagado')->count();

        // 4. Ingresos (Suma del total de órdenes pagadas durante la jornada)
        $totalRevenue = Order::where('status', 'pagado')
            ->whereBetween('updated_at', [$startTime, $endTime])
            ->sum('total');

        // 5. Top 5 Productos más vendidos en esta jornada
        $topProducts = OrderDetail::select('product_id', DB::raw('SUM(quantity) as total_quantity'))
            ->whereHas('order', function ($query) use ($startTime, $endTime) {
                $query->where('status', 'pagado')
                      ->whereBetween('updated_at', [$startTime, $endTime]);
            })
            ->with('product:id,name,price')
            ->groupBy('product_id')
            ->orderByDesc('total_quantity')
            ->take(5)
            ->get();

        return response()->json([
            'tables' => [
                'total' => $totalTables,
                'occupied' => $occupiedTables,
                'free' => $freeTables,
                'data' => $tables
            ],
            'orders' => [
                'total_today' => $totalOrders,
                'pending' => $pendingOrders,
                'served' => $servedOrders,
                'paid' => $paidOrders
            ],
            'revenue' => [
                'today' => $totalRevenue
            ],
            'top_products' => $topProducts
        ]);
    }
}
