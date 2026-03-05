<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Table;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Obtiene métricas en tiempo real para el Panel de Administración.
     */
    public function metrics()
    {
        // 1. Métricas de Mesas
        $tables = Table::all();
        $totalTables = $tables->count();
        $occupiedTables = $tables->where('status', 'ocupada')->count();
        $freeTables = $tables->where('status', 'libre')->count();

        // 2. Métricas de Órdenes (Globales)
        $allOrders = Order::all();
        
        $totalOrders = $allOrders->count();
        $pendingOrders = $allOrders->whereIn('status', ['pendiente', 'en_preparacion'])->count();
        $servedOrders = $allOrders->where('status', 'servido')->count();
        $paidOrders = $allOrders->where('status', 'pagado')->count();

        // 3. Ingresos (Suma del total de órdenes pagadas)
        $totalRevenue = $allOrders->where('status', 'pagado')->sum('total');

        // 4. Top 5 Productos más vendidos globalmente
        $topProducts = OrderDetail::select('product_id', DB::raw('SUM(quantity) as total_quantity'))
            ->whereHas('order', function ($query) {
                $query->where('status', 'pagado');
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
                'data' => $tables // Por si queremos dibujar un mapa de mesas
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
