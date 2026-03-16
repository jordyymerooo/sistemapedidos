<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\ShiftController;

// Ruta de Autenticación Genérica
Route::post('/login', [AuthController::class, 'login']);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

use App\Http\Controllers\Api\CategoryController;

// Rutas Públicas de Catálogo
Route::apiResource('products', ProductController::class);
Route::apiResource('categories', CategoryController::class);

// Métricas de Rendimiento (Ahora para Cajeros)
use App\Http\Controllers\Api\AdminController;
Route::get('/metrics', [AdminController::class, 'metrics']);

// Rutas de Usuarios y Mesas para el Panel Admin
use App\Http\Controllers\Api\UserController;
Route::apiResource('users', UserController::class);

use App\Http\Controllers\Api\TableController;
Route::apiResource('tables', TableController::class);
Route::patch('/tables/{table}/call-waiter',    [TableController::class, 'callWaiter']);
Route::patch('/tables/{table}/dismiss-waiter', [TableController::class, 'dismissWaiter']);

// Rutas de Órdenes
Route::get('/orders', [OrderController::class, 'index']);
Route::get('/orders/pending', [OrderController::class, 'pending']);
Route::get('/orders/ready', [OrderController::class, 'ready']); // Mostrar en barra
Route::get('/orders/served', [OrderController::class, 'served']);
Route::post('/orders', [OrderController::class, 'store']);
Route::patch('/orders/{order}/ready', [OrderController::class, 'markAsReady']);
Route::patch('/orders/{order}/deliver', [OrderController::class, 'deliver']); // Servir a la mesa
Route::patch('/orders/{order}/pay', [OrderController::class, 'pay']);

// Rutas de Jornada Laboral (Turnos)
Route::get('/shifts/current', [ShiftController::class, 'current']);
Route::post('/shifts/start', [ShiftController::class, 'start']);
Route::post('/shifts/end', [ShiftController::class, 'end']);
Route::get('/shifts', [ShiftController::class, 'index']);
Route::get('/shifts/{id}/summary', [ShiftController::class, 'summary']);

// Auditoría y Alertas del Sistema
use App\Http\Controllers\Api\AuditController;
Route::get('/audit-logs', [AuditController::class, 'index']);
Route::get('/alerts', [AuditController::class, 'alerts']);
