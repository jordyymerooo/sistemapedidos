import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const CashierView = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    // Estado para guardar qué items (order_details.id) están seleccionados por cada orden
    const [selectedItemsByOrder, setSelectedItemsByOrder] = useState({});

    // --- MÉTTRICAS ---
    const [metrics, setMetrics] = useState({
        tables: { total: 0, occupied: 0, free: 0 },
        orders: { total_today: 0, pending: 0, served: 0, paid: 0 },
        revenue: { today: 0 },
        top_products: []
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            await Promise.all([fetchServedOrders(), fetchMetrics()]);
        };
        fetchInitialData();

        const intervalId = setInterval(() => {
            fetchServedOrders();
            fetchMetrics();
        }, 8000);
        return () => clearInterval(intervalId);
    }, []);

    const fetchServedOrders = async () => {
        try {
            const { data } = await axios.get('/api/orders/served');
            setOrders(data);

            // Inicializar checkboxes marcando todos por defecto si es una nueva orden
            const initialSelection = { ...selectedItemsByOrder };
            data.forEach(order => {
                if (!initialSelection[order.id]) {
                    initialSelection[order.id] = order.details.map(d => d.id);
                }
            });
            setSelectedItemsByOrder(initialSelection);
        } catch (error) {
            console.error("Error fetching served orders", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetrics = async () => {
        try {
            const { data } = await axios.get('/api/metrics'); // El nuevo endpoint para métricas
            setMetrics(data);
        } catch (error) {
            console.error("Error fetching metrics in CashierView", error);
        }
    };

    const handleToggleItem = (orderId, detailId) => {
        setSelectedItemsByOrder(prev => {
            const orderItems = prev[orderId] || [];
            if (orderItems.includes(detailId)) {
                return { ...prev, [orderId]: orderItems.filter(id => id !== detailId) };
            } else {
                return { ...prev, [orderId]: [...orderItems, detailId] };
            }
        });
    };

    const handleSelectAll = (orderId, detailIds) => {
        setSelectedItemsByOrder(prev => ({
            ...prev,
            [orderId]: prev[orderId]?.length === detailIds.length ? [] : detailIds
        }));
    };

    const handlePayOrder = async (order) => {
        const selectedIds = selectedItemsByOrder[order.id] || [];

        if (selectedIds.length === 0) {
            alert('Debes seleccionar al menos un producto para cobrar.');
            return;
        }

        const isPartial = selectedIds.length < order.details.length;
        const confirmMsg = isPartial
            ? `¿Deseas cobrar SOLO los ${selectedIds.length} productos seleccionados? La mesa seguirá ocupada por el resto.`
            : `¿Confirma que este pedido ha sido pagado en su totalidad y desea liberar la mesa?`;

        if (!confirm(confirmMsg)) return;

        try {
            await axios.patch(`/api/orders/${order.id}/pay`, {
                detail_ids: selectedIds
            });

            // Refrescar órdenes para ver si la orden se cerró o se dividió, y las métricas
            fetchServedOrders();
            fetchMetrics();
            alert('Cobro registrado exitosamente');
        } catch (error) {
            console.error("Error procesando el pago", error);
            alert("Ocurrió un error al procesar el pago.");
        }
    };

    const calculateSelectedTotal = (order) => {
        const selectedIds = selectedItemsByOrder[order.id] || [];
        return order.details
            .filter(d => selectedIds.includes(d.id))
            .reduce((sum, d) => sum + parseFloat(d.subtotal), 0)
            .toFixed(2);
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center font-bold text-slate-400">Generando Tablero...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-10">
            <header className="max-w-6xl mx-auto mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800">Caja y Facturación</h1>
                    <p className="text-xs md:text-sm text-slate-500 font-medium">Panel de cobros y rendimiento en tiempo real</p>
                </div>
                <Link to="/" className="w-full md:w-auto text-center text-sm font-semibold text-green-600 hover:text-green-800 px-4 py-2 border border-green-200 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                    &larr; Volver al Menú
                </Link>
            </header>

            {/* DASHBOARD MÉTTRICAS EN CAJA */}
            <div className="max-w-6xl mx-auto mb-8 md:mb-10">
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                    {/* Ingresos */}
                    <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200">
                        <div className="flex items-center text-emerald-500 mb-1 md:mb-2">
                            <svg className="w-4 h-4 md:w-5 md:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <h3 className="font-semibold text-xs md:text-sm">Ingresos Hoy</h3>
                        </div>
                        <p className="text-lg md:text-2xl font-black text-slate-800">${parseFloat(metrics.revenue.today).toFixed(2)}</p>
                    </div>

                    {/* Mesas */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <div className="flex items-center text-blue-500 mb-2">
                            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                            <h3 className="font-semibold text-sm">Mesas Ocupadas</h3>
                        </div>
                        <p className="text-2xl font-black text-slate-800">
                            {metrics.tables.occupied} <span className="text-base text-slate-400 font-medium whitespace-nowrap">/ {metrics.tables.total}</span>
                        </p>
                    </div>

                    {/* Órdenes */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <div className="flex items-center text-orange-500 mb-2">
                            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                            <h3 className="font-semibold text-sm">En Cocina</h3>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{metrics.orders.pending}</p>
                    </div>

                    {/* Finalizados */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <div className="flex items-center text-purple-500 mb-2">
                            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <h3 className="font-semibold text-sm">Completados</h3>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{metrics.orders.paid}</p>
                    </div>
                </div>
            </div>

            {/* SEPARADOR visual */}
            <div className="max-w-6xl mx-auto border-t border-slate-200 mb-8 pt-4">
                <h2 className="text-xl font-bold text-slate-700">Órdenes Pendientes de Cobro ({orders.length})</h2>
            </div>
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-400 mb-4">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-700">No hay pedidos pendientes de cobro</h2>
                        <p className="text-slate-400 mt-2">Los pedidos aparecerán aquí cuando la cocina los marque como "Servidos".</p>
                    </div>
                ) : (
                    orders.map(order => {
                        const isAllSelected = selectedItemsByOrder[order.id]?.length === order.details.length;
                        const hasSelection = selectedItemsByOrder[order.id]?.length > 0;
                        const allDetailIds = order.details.map(d => d.id);

                        return (
                            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                                <div className="bg-amber-500 px-6 py-4 flex justify-between items-center text-white">
                                    <div>
                                        <h3 className="font-black text-xl">Mesa {order.table?.number}</h3>
                                        <p className="text-amber-100 text-xs font-semibold uppercase tracking-wider">Orden #{order.id}</p>
                                    </div>
                                    <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">
                                        Por Cobrar
                                    </div>
                                </div>

                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-center mb-3 text-sm text-slate-500 font-semibold border-b border-slate-100 pb-2">
                                        <label className="flex items-center cursor-pointer hover:text-slate-800">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-green-500 focus:ring-green-500 w-4 h-4 mr-2 cursor-pointer"
                                                checked={isAllSelected}
                                                onChange={() => handleSelectAll(order.id, allDetailIds)}
                                            />
                                            Seleccionar Todo
                                        </label>
                                        <span>División de Cuenta</span>
                                    </div>

                                    <ul className="divide-y divide-slate-100 mb-6 flex-1 max-h-60 overflow-y-auto pr-2">
                                        {order.details.map(detail => {
                                            const isChecked = selectedItemsByOrder[order.id]?.includes(detail.id);
                                            return (
                                                <li key={detail.id} className="py-3 flex justify-between items-center group">
                                                    <div className="flex items-start">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleItem(order.id, detail.id)}
                                                            className="rounded border-slate-300 text-green-500 focus:ring-green-500 w-4 h-4 mt-0.5 mr-3 cursor-pointer"
                                                        />
                                                        <div>
                                                            <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded mr-2 inline-block mb-1">x{detail.quantity}</span>
                                                            <span className={`font-semibold text-sm block ${!isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{detail.product?.name}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`font-bold text-sm ${!isChecked ? 'text-slate-400 line-through' : 'text-slate-600'}`}>${parseFloat(detail.subtotal).toFixed(2)}</span>
                                                </li>
                                            )
                                        })}
                                    </ul>

                                    <div className="border-t border-slate-200 pt-4 mb-6">
                                        <div className="flex justify-between items-end">
                                            <span className="text-slate-500 font-semibold uppercase text-sm tracking-wider">Total Seleccionado</span>
                                            <span className="text-4xl font-black text-green-600">${calculateSelectedTotal(order)}</span>
                                        </div>
                                        {!isAllSelected && hasSelection && (
                                            <p className="text-xs text-amber-600 font-bold mt-2 text-right">Cobro Parcial. La mesa no se liberará.</p>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handlePayOrder(order)}
                                        disabled={!hasSelection}
                                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all flex justify-center items-center">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        {isAllSelected ? 'Cobrar y Liberar Mesa' : 'Cobrar Selección'}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default CashierView;
