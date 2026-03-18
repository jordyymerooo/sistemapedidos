<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function index()
    {
        return response()->json(Location::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:locations'
        ]);

        $location = Location::create($validated);
        return response()->json($location, 201);
    }

    public function destroy($id)
    {
        $location = Location::findOrFail($id);
        
        // Verificar si tiene mesas asociadas
        if ($location->tables()->count() > 0) {
            return response()->json(['error' => 'No se puede eliminar un lugar que tiene mesas asociadas.'], 400);
        }

        $location->delete();
        return response()->json(null, 204);
    }
}
