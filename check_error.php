<?php
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

try {
    User::create([
        'name' => 'Admin Test',
        'email' => 'admin@test.com',
        'password' => Hash::make('1234'),
        'role' => 'admin'
    ]);
    echo "¡Creado con exito!\n";
} catch (\Exception $e) {
    echo "ERROR EXCEPCION:\n";
    echo $e->getMessage() . "\n";
}
