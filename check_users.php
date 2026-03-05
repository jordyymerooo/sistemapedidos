<?php
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "--- LISTA ACTULA DE USUARIOS ---\n";
echo json_encode(User::all());
echo "\n--------------------------------\n";
