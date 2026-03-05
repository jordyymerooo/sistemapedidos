<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Category::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name'
        ]);

        $category = Category::create($validated);

        return response()->json($category, 201);
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);
        
        try {
            $category->delete();
            return response()->json(['message' => 'Categoría eliminada'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'No se puede eliminar la categoría porque tiene productos asociados.'], 400);
        }
    }
}
