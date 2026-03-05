<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Valida credenciales de acceso de forma agnóstica para cualquier vista.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'password' => 'required|string',
            'role' => 'required|in:mesero,cocinero,cajero,admin' // Se envía desde qué vista se intenta conectar
        ]);

        $user = User::find($validated['user_id']);

        // Verificamos que el rol coincida con la URL/Rol en el frontend
        if ($user->role !== $validated['role']) {
            return response()->json(['message' => 'No tienes permiso para acceder a este panel.'], 403);
        }

        // Chequear Hash del PIN/Contraseña
        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Credenciales incorrectas.'], 401);
        }

        // Autenticación correcta (en SPA con React, no emitiremos tokens complejos por ahora, 
        // pasamos los datos del usuario para instanciar su sesión).
        return response()->json([
            'message' => 'Login Successful',
            'user' => $user
        ]);
    }
}
