<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TableController extends Controller
{
    public function index()
    {
        return response()->json(\App\Models\Table::with('location')->orderBy('number')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'number'      => 'required|integer',
            'location_id' => 'required|exists:locations,id',
            'status'      => 'required|in:libre,ocupada'
        ]);

        $table = \App\Models\Table::create($validated);
        return response()->json($table, 201);
    }

    public function update(Request $request, \App\Models\Table $table)
    {
        $validated = $request->validate([
            'number'         => 'sometimes|integer',
            'location_id'    => 'sometimes|exists:locations,id',
            'status'         => 'sometimes|in:libre,ocupada',
            'needs_cleaning' => 'sometimes|boolean',
            'needs_waiter'   => 'sometimes|boolean',
        ]);

        $table->update($validated);
        return response()->json($table->load('location'));
    }

    public function destroy(\App\Models\Table $table)
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($table) {
            // Eliminar detalles de órdenes asociadas a esta mesa
            \Illuminate\Support\Facades\DB::table('order_items')
                ->whereIn('order_id', function($query) use ($table) {
                    $query->select('id')->from('orders')->where('table_id', $table->id);
                })->delete();
                
            // Eliminar órdenes asociadas a esta mesa
            \Illuminate\Support\Facades\DB::table('orders')->where('table_id', $table->id)->delete();
            
            // Eliminar la mesa
            $table->delete();
        });

        return response()->json(null, 204);
    }

    // ---- Llamada al mesero ----

    public function callWaiter(\App\Models\Table $table)
    {
        $table->update(['needs_waiter' => true]);
        return response()->json($table);
    }

    public function dismissWaiter(\App\Models\Table $table)
    {
        $table->update(['needs_waiter' => false]);
        return response()->json($table);
    }
}

