<?php
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

try {
    DB::statement("SELECT setval('users_id_seq', coalesce((SELECT MAX(id)+1 FROM users), 1), false);");
} catch (\Exception $e) {
    echo "Secuencias no compatibles u omitidas: " . $e->getMessage() . "\n";
}

User::whereIn('email', ['admin@test.com', 'cajero@test.com', 'cocinero@test.com', 'mesero@test.com'])->delete();

User::create(['name' => 'Admin Test', 'email' => 'admin@test.com', 'password' => Hash::make('1234'), 'role' => 'admin']);
User::create(['name' => 'Cajero Test', 'email' => 'cajero@test.com', 'password' => Hash::make('1234'), 'role' => 'cajero']);
User::create(['name' => 'Cocinero Test', 'email' => 'cocinero@test.com', 'password' => Hash::make('1234'), 'role' => 'cocinero']);
User::create(['name' => 'Mesero Test', 'email' => 'mesero@test.com', 'password' => Hash::make('1234'), 'role' => 'mesero']);

echo "\n--- USUARIOS CREADOS EXITOSAMENTE ---\n";
