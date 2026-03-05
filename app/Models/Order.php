<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $guarded = [];

    public function details()
    {
        return $this->hasMany(OrderDetail::class);
    }
    
    public function product()
    {
        return $this->hasManyThrough(Product::class, OrderDetail::class, 'order_id', 'id', 'id', 'product_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function table()
    {
        return $this->belongsTo(Table::class);
    }
}
