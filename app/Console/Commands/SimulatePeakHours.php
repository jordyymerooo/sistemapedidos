<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Table;
use App\Models\Product;
use App\Models\User;

class SimulatePeakHours extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:simulate-peak-hours {count=50}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Simula un entorno de alto tráfico creando múltiples comandas concurrentes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $count = (int) $this->argument('count');
        $this->info("Iniciando simulacion: Creando {$count} ordenes masivas...");

        $tables = Table::all();
        $waiters = User::where('role', 'mesero')->get();
        $products = Product::all();
        $statuses = ['pendiente', 'en_preparacion']; // Solo estos para que Cocina tenga que trabajar y Caja los vea sumados.
        $notes = ['Sin cebolla', 'Extra picante', 'Para llevar', 'Con todo', null, null, null]; // Mayormente nulos
        
        if($products->isEmpty() || $waiters->isEmpty() || $tables->isEmpty()){
            $this->error("Asegurate de tener Products, Tables y Waiters en la BD primero (corre db:seed)");
            return;
        }

        $bar = $this->output->createProgressBar($count);

        for ($i = 0; $i < $count; $i++) {
            // Creamos la cabecera de la orden
            $order = Order::create([
                'table_id' => $tables->random()->id,
                'user_id' => $waiters->random()->id, // Mesero aleatorio
                'status' => $statuses[array_rand($statuses)],
                'created_at' => now()->subMinutes(rand(1, 25)), // Hace que algunas parezcan viejisimas para el timer
                'updated_at' => now()
            ]);

            // Decidir cuántos ítems tendrá esta orden (1 a 5)
            $itemsCount = rand(1, 4);
            $orderTotal = 0;

            for ($j = 0; $j < $itemsCount; $j++) {
                $product = $products->random();
                $qty = rand(1, 3);
                $subtotal = $product->price * $qty;
                $orderTotal += $subtotal;

                OrderDetail::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'quantity' => $qty,
                    'subtotal' => $subtotal,
                    'status' => 'pendiente',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
            
            // Actualizar total general de la orden
            $order->update(['total' => $orderTotal]);

            // Cambiar la mesa a ocupada para coherencia
            Table::where('id', $order->table_id)->update(['status' => 'ocupada']);
            
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("✅ ¡Simulacion completada con exito! Visita el visor de Cocina y Caja.");
    }
}
