<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Table;
use App\Models\Shift;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    /**
     * Retorna el historial de acciones del sistema (para el panel Admin).
     */
    public function index(Request $request)
    {
        $logs = AuditLog::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(200)
            ->get()
            ->map(function ($log) {
                return [
                    'id'         => $log->id,
                    'action'     => $log->action,
                    'entity'     => $log->entity,
                    'entity_id'  => $log->entity_id,
                    'details'    => $log->details,
                    'ip_address' => $log->ip_address,
                    'user_name'  => $log->user?->name ?? 'Sistema',
                    // toJSON() garantiza formato UTC con Z → JS lo parsea correctamente
                    'created_at' => $log->created_at?->toJSON(),
                ];
            });

        return response()->json($logs);
    }

    /**
     * Retorna alertas de inconsistencias activas en el sistema.
     */
    public function alerts()
    {
        $alerts = [];

        // 1. Órdenes sin cobrar con más de 8 horas desde que fueron servidas
        $oldOrders = Order::whereIn('status', ['pendiente', 'en_preparacion', 'servido', 'listo'])
            ->where('created_at', '<', now()->subHours(8))
            ->with('table')
            ->get();

        foreach ($oldOrders as $order) {
            $alerts[] = [
                'type'    => 'old_order',
                'level'   => 'warning',
                'message' => "Orden #{$order->id} (Mesa {$order->table?->number}) lleva más de 8 horas sin cobrar.",
            ];
        }

        // 2. Mesas ocupadas sin órdenes activas vinculadas
        $occupiedTables = Table::where('status', 'ocupada')->get();
        foreach ($occupiedTables as $table) {
            $hasActiveOrder = Order::where('table_id', $table->id)
                ->whereIn('status', ['pendiente', 'en_preparacion', 'servido', 'listo'])
                ->exists();

            if (!$hasActiveOrder) {
                $alerts[] = [
                    'type'    => 'orphan_table',
                    'level'   => 'warning',
                    'message' => "Mesa {$table->number} figura como ocupada pero no tiene órdenes activas.",
                ];
            }
        }

        // 3. Jornada activa por más de 16 horas
        $activeShift = Shift::where('status', 'open')->first();
        if ($activeShift) {
            $hoursOpen = now()->diffInHours($activeShift->start_time);
            if ($hoursOpen >= 16) {
                $alerts[] = [
                    'type'    => 'long_shift',
                    'level'   => 'critical',
                    'message' => "La jornada lleva {$hoursOpen} horas abierta. ¿Olvidaste cerrar el día?",
                ];
            }
        }

        return response()->json([
            'count'  => count($alerts),
            'alerts' => $alerts,
        ]);
    }
}
