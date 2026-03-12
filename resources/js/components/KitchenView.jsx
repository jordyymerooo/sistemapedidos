import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

// Configurar axios globalmente para Sanctum (opcional, dependiendo de tu auth)
axios.defaults.withCredentials = true;

const KitchenView = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkedItems, setCheckedItems] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        fetchPendingOrders();

        const dataInterval = setInterval(() => {
            fetchPendingOrders();
        }, 8000);

        const timerInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            clearInterval(dataInterval);
            clearInterval(timerInterval);
        };
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

    const toggleItemCheck = (orderId, detailId) => {
        const key = `${orderId}-${detailId}`;
        setCheckedItems(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
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

    const getWaitTime = (createdAtString) => {
        if (!createdAtString) return { text: '00:00', isLate: false };
        const orderTime = new Date(createdAtString);
        const diffInMs = currentTime - orderTime;

        // Si el tiempo del servidor es adelantado, mostrar 0 para evitar negativos
        if (diffInMs < 0) return { text: '00:00', isLate: false };

        const diffInMinutes = Math.floor(diffInMs / 60000);
        const diffInSeconds = Math.floor((diffInMs % 60000) / 1000);

        const formattedMin = String(diffInMinutes).padStart(2, '0');
        const formattedSec = String(diffInSeconds).padStart(2, '0');

        return {
            text: `${formattedMin}:${formattedSec}`,
            isLate: diffInMinutes >= 20 // Se vuelve rojo a los 20 min
        };
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center font-bold text-gray-400">Cargando comandas de cocina...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <header className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between space-y-3 md:space-y-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800">Vista de Cocina</h1>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs md:text-sm font-semibold text-orange-700 w-fit">
                        {orders.length} pedidos pendientes
                    </span>
                </div>
                <div className="flex w-full md:w-auto">
                    <Link to="/" className="flex-1 md:flex-none text-center text-sm font-semibold text-orange-600 hover:text-orange-800 px-4 py-2 border border-orange-200 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
                        &larr; Volver
                    </Link>
                </div>
            </header>

            {orders.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 md:p-12 text-center text-sm md:text-base text-gray-400 font-medium">
                    Cocina despejada. Buen trabajo.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {orders.map((order) => {
                        const { text: timeText, isLate } = getWaitTime(order.created_at);

                        return (
                            <article
                                key={order.id}
                                className={`flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ring-1 transition-all hover:shadow-md ${isLate ? 'ring-rose-400/50 shadow-rose-100' : 'ring-black/5'}`}
                            >
                                <div className={`px-3 md:px-4 py-2 md:py-3 flex items-center justify-between text-white transition-colors duration-500 ${isLate ? 'bg-rose-600 animate-pulse' : 'bg-slate-800'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${isLate ? 'bg-rose-500 text-white shadow-inner' : 'bg-slate-900 text-white'}`}>
                                            {order.table?.number || '?'}
                                        </div>
                                        <h2 className="text-sm font-semibold text-slate-200">Mesa</h2>
                                    </div>
                                    <div className={`flex items-center gap-1.5 font-bold tracking-widest ${isLate ? 'text-white' : 'text-slate-300'}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        {timeText}
                                    </div>
                                </div>

                                {/* Cinta de Estado (Debajo del Header oscuro) */}
                                {order.status === 'en_preparacion' && (
                                    <div className="bg-amber-100 text-amber-700 text-[10px] md:text-xs font-bold text-center py-1 border-b border-amber-200 tracking-wider">
                                        EN PREPARACIÓN
                                    </div>
                                )}

                                <div className="p-3 md:p-4 flex-grow flex flex-col">
                                    <ul className="mb-4 md:mb-6 flex-grow divide-y divide-gray-100">
                                        {order.details?.map((detail) => {
                                            const isChecked = checkedItems[`${order.id}-${detail.id}`];
                                            return (
                                                <li key={detail.id} className={`flex py-2 md:py-3 transition-colors ${isChecked ? 'bg-slate-50/50' : ''}`}>
                                                    <div className="flex items-start mr-3 mt-0.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!isChecked}
                                                            onChange={() => toggleItemCheck(order.id, detail.id)}
                                                            className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 w-5 h-5 cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col w-full">
                                                        <div className="flex justify-between items-center text-slate-800">
                                                            <span className={`font-semibold text-sm md:text-base leading-tight pr-2 transition-all ${isChecked ? 'line-through text-slate-400' : ''}`}>
                                                                {detail.product?.name || 'Producto Desconocido'}
                                                            </span>
                                                            <span className={`text-sm font-bold px-2 py-0.5 rounded flex-shrink-0 transition-colors ${isChecked ? 'bg-slate-50 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                                                x{detail.quantity}
                                                            </span>
                                                        </div>
                                                        {detail.notes && (
                                                            <span className={`text-[10px] md:text-xs font-bold px-2 py-1 mt-1.5 md:mt-1 rounded border inline-block w-fit transition-colors ${isChecked ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                                                ⚠️ {detail.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>

                                    <button
                                        onClick={() => handleMarkAsReady(order.id)}
                                        className="w-full rounded-lg bg-emerald-600 py-3 md:py-3.5 font-bold text-white text-sm md:text-base transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                                    >
                                        ¡Comanda Lista! ✓
                                    </button>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default KitchenView;
