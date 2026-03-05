import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Configurar axios globalmente para Sanctum (opcional, dependiendo de tu auth)
axios.defaults.withCredentials = true;

const KitchenView = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPendingOrders();

        // Polling cada 8 segundos para simular tiempo real si aún no hay WebSockets
        const intervalId = setInterval(() => {
            fetchPendingOrders();
        }, 8000);

        return () => clearInterval(intervalId);
    }, []);

    const fetchPendingOrders = async () => {
        try {
            // Nota: La URL depende de tu enrutamiento API en Laravel
            const { data } = await axios.get('/api/orders/pending');
            setOrders(data);
        } catch (error) {
            console.error('Error al obtener los pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsReady = async (orderId) => {
        try {
            // Actualización optimista: lo removemos de la UI instantáneamente
            setOrders(currentOrders => currentOrders.filter(o => o.id !== orderId));

            await axios.patch(`/api/orders/${orderId}/ready`);
        } catch (error) {
            console.error('Ocurrió un error al despachar', error);
            // Revertir si falla
            fetchPendingOrders();
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center font-bold text-gray-400">Cargando comandas de cocina...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-black text-slate-800">Vista de Cocina</h1>
                <span className="rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-700">
                    {orders.length} pedidos pendientes
                </span>
            </header>

            {orders.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center text-gray-400 font-medium">
                    Cocina despejada. Buen trabajo.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {orders.map((order) => (
                        <article
                            key={order.id}
                            className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md"
                        >
                            <div className="bg-orange-500 px-4 py-3 flex items-center justify-between text-white">
                                <div>
                                    <h2 className="text-xl font-bold">Mesa {order.table?.number || '?'}</h2>
                                </div>
                                <div className="text-right text-xs font-semibold bg-orange-600/50 px-2 py-1 rounded">
                                    {order.status === 'en_preparacion' ? 'PREPARANDO' : 'NUEVO'}
                                </div>
                            </div>

                            <div className="p-4 flex-grow flex flex-col">
                                <ul className="mb-6 flex-grow divide-y divide-gray-100">
                                    {order.details?.map((detail) => (
                                        <li key={detail.id} className="flex py-2 text-slate-700">
                                            <div className="flex flex-col ml-3 flex-1">
                                                <div className="flex justify-between items-center text-slate-800">
                                                    <span className="font-semibold">{detail.product?.name || 'Producto Desconocido'}</span>
                                                    <span className="text-sm font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">x{detail.quantity}</span>
                                                </div>
                                                {detail.notes && (
                                                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 mt-1 rounded border border-amber-200 inline-block w-fit">
                                                        ⚠️ {detail.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleMarkAsReady(order.id)}
                                    className="w-full rounded-lg bg-emerald-500 py-3 font-bold text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                                >
                                    ¡Comanda Lista! ✓
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KitchenView;
