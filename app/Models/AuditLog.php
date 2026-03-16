<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false; // Solo usamos created_at definido en la migración

    protected $fillable = [
        'user_id',
        'action',
        'entity',
        'entity_id',
        'details',
        'ip_address',
        'created_at',
    ];

    protected $casts = [
        'details' => 'array',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Helper estático para registrar acciones desde cualquier controlador.
     * Tolerante a fallos: si falla el log, NO interrumpe el flujo de negocio.
     */
    public static function record(string $action, ?int $userId = null, ?string $entity = null, ?int $entityId = null, array $details = [], ?string $ip = null): void
    {
        try {
            static::create([
                'user_id'   => $userId,
                'action'    => $action,
                'entity'    => $entity,
                'entity_id' => $entityId,
                'details'   => $details ?: null,
                'ip_address'=> $ip ?? request()->ip(),
                'created_at'=> now(),
            ]);
        } catch (\Throwable $e) {
            // El log nunca debe romper el flujo del sistema; registrar en Laravel log
            \Log::warning("AuditLog::record falló [{$action}]: " . $e->getMessage());
        }
    }
}
