<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TableController extends Controller
{
    public function index()
    {
        return response()->json(\App\Models\Table::orderBy('number')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'number' => 'required|integer|unique:tables',
            'status' => 'required|in:libre,ocupada'
        ]);

        $table = \App\Models\Table::create($validated);
        return response()->json($table, 201);
    }

    public function update(Request $request, \App\Models\Table $table)
    {
        $validated = $request->validate([
            'number' => 'sometimes|integer|unique:tables,number,'.$table->id,
            'status' => 'sometimes|in:libre,ocupada'
        ]);

        $table->update($validated);
        return response()->json($table);
    }

    public function destroy(\App\Models\Table $table)
    {
        $table->delete();
        return response()->json(null, 204);
    }
}
