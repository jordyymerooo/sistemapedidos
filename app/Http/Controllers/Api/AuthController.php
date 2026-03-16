<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Shift;
use App\Models\AuditLog;
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
            'role' => 'required|in:mesero,cocinero,cajero,admin'
        ]);

        $user = User::find($validated['user_id']);

        // Verificar que el rol coincida
        if ($user->role !== $validated['role']) {
            AuditLog::record('login_wrong_role', $user->id, 'user', $user->id, [
                'attempted_role' => $validated['role']
            ]);
            return response()->json(['message' => 'No tienes permiso para acceder a este panel.'], 403);
        }

        // === BLOQUEO POR INTENTOS FALLIDOS ===
        if ($user->locked_until && now()->lt($user->locked_until)) {
            $minutesLeft = (int) now()->diffInMinutes($user->locked_until) + 1;
            return response()->json([
                'message' => "🔒 Cuenta bloqueada por intentos fallidos. Intenta en {$minutesLeft} minuto(s)."
            ], 423);
        }

        // === BLOQUEO DE JORNADA ===
        if (in_array($validated['role'], ['mesero', 'cocinero'])) {
            $activeShift = Shift::where('status', 'open')->first();
            if (!$activeShift) {
                AuditLog::record('login_blocked_no_shift', $user->id, 'user', $user->id, [
                    'role' => $validated['role']
                ]);
                return response()->json([
                    'message' => '🔒 Jornada no iniciada. Espera a que Caja abra el servicio del día.'
                ], 423);
            }
        }

        // === VERIFICAR PIN ===
        if (!Hash::check($validated['password'], $user->password)) {
            $attempts = $user->login_attempts + 1;
            $lockData = ['login_attempts' => $attempts];

            if ($attempts >= 5) {
                $lockData['locked_until'] = now()->addMinutes(5);
                $lockData['login_attempts'] = 0;
            }

            $user->update($lockData);

            AuditLog::record('login_failed', $user->id, 'user', $user->id, [
                'attempts' => $attempts
            ]);

            $remaining = 5 - $attempts;
            $msg = $attempts >= 5
                ? 'Demasiados intentos fallidos. Cuenta bloqueada 5 minutos.'
                : "Credenciales incorrectas. Te quedan {$remaining} intento(s).";

            return response()->json(['message' => $msg], 401);
        }

        // === LOGIN EXITOSO ===
        $user->update(['login_attempts' => 0, 'locked_until' => null]);

        AuditLog::record('login_success', $user->id, 'user', $user->id, [
            'role' => $user->role
        ]);

        return response()->json([
            'message' => 'Login Successful',
            'user' => $user
        ]);
    }
}
