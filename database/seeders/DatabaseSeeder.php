<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Crear usuarios
        $mesero = User::factory()->create([
            'name' => 'Mesero Juan',
            'email' => 'juan@restaurante.com',
            'role' => 'mesero'
        ]);

        User::factory()->create([
            'name' => 'Cocinero Pedro',
            'email' => 'pedro@restaurante.com',
            'role' => 'cocinero'
        ]);

        // 2. Crear mesas
        $mesas = [];
        for ($i = 1; $i <= 5; $i++) {
            $mesas[] = \App\Models\Table::create(['number' => $i, 'status' => 'libre']);
        }

        // 3. Crear categorías
        $catPlatos = \App\Models\Category::create(['name' => 'Platos Fuertes']);
        $catBebidas = \App\Models\Category::create(['name' => 'Bebidas']);

        // 4. Crear productos
        $p1 = \App\Models\Product::create([
            'category_id' => $catPlatos->id,
            'name' => 'Lomo Saltado',
            'price' => 15.50,
            'stock' => 50
        ]);
        $p2 = \App\Models\Product::create([
            'category_id' => $catPlatos->id,
            'name' => 'Arroz con Mariscos',
            'price' => 18.00,
            'stock' => 30
        ]);
        $p3 = \App\Models\Product::create([
            'category_id' => $catBebidas->id,
            'name' => 'Chicha Morada 1L',
            'price' => 5.00,
            'stock' => 100
        ]);

        // 5. Crear una orden de prueba para la vista de cocina
        $order = \App\Models\Order::create([
            'user_id' => $mesero->id,
            'table_id' => $mesas[1]->id, // Mesa 2
            'status' => 'en_preparacion',
            'total' => ($p1->price * 2) + ($p3->price * 1)
        ]);

        $order->details()->createMany([
            ['product_id' => $p1->id, 'quantity' => 2, 'subtotal' => $p1->price * 2],
            ['product_id' => $p3->id, 'quantity' => 1, 'subtotal' => $p3->price * 1]
        ]);

        $mesas[1]->update(['status' => 'ocupada']);
    }
}
