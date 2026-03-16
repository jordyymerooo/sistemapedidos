import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const CashierView = ({ activeCashier, onLogout }) => {
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

    // --- JORNADA LABORAL ---
    const [currentShift, setCurrentShift] = useState(null);

    // --- LLAMADAS A MESERO ---
    const [callingTables, setCallingTables] = useState([]);
    // --- REPORTE DE CIERRE ---
    const [shiftReport, setShiftReport] = useState(null);
    // --- RELOJ ECUADOR ---
    const [currentTime, setCurrentTime] = useState(new Date());
    // --- PROTECCIÓN DOBLE CLICK ---
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const clockId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(clockId);
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            await Promise.all([fetchServedOrders(), fetchMetrics(), fetchCurrentShift(), fetchCallingTables()]);
        };
        fetchInitialData();

        const intervalId = setInterval(() => {
            fetchServedOrders();
            fetchMetrics();
            fetchCurrentShift();
            fetchCallingTables();
        }, 8000);
        return () => clearInterval(intervalId);
    }, []);

    const fetchServedOrders = async () => {
        try {
            const { data } = await axios.get('/api/orders/served');
            setOrders(data);

            // Usar forma funcional para leer el estado más reciente y
            // NO sobreescribir lo que el cajero ya seleccionó manualmente.
            setSelectedItemsByOrder(prev => {
                const updated = { ...prev };
                data.forEach(order => {
                    // Solo inicializar si es una orden que NO existía antes
                    if (!(order.id in updated)) {
                        updated[order.id] = order.details.map(d => d.id);
                    }
                });
                return updated;
            });
        } catch (error) {
            console.error("Error fetching served orders", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetrics = async () => {
        try {
            const { data } = await axios.get('/api/metrics');
            setMetrics(data);
        } catch (error) {
            console.error("Error fetching metrics in CashierView", error);
        }
    };

    const fetchCurrentShift = async () => {
        try {
            const { data } = await axios.get('/api/shifts/current');
            setCurrentShift(data);
        } catch (error) {
            console.error("Error fetching current shift", error);
        }
    };

    const fetchCallingTables = async () => {
        try {
            const { data } = await axios.get('/api/tables');
            setCallingTables(data.filter(t => t.needs_waiter));
        } catch (error) {
            console.error("Error fetching calling tables", error);
        }
    };

    const handleDismissWaiter = async (tableId) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await axios.patch(`/api/tables/${tableId}/dismiss-waiter`);
            setCallingTables(prev => prev.filter(t => t.id !== tableId));
        } catch (error) {
            console.error("Error dismissing waiter call", error);
            alert("No se pudo marcar como atendido.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStartShift = async () => {
        if (submitting) return;
        if (!confirm("¿Deseas iniciar la jornada laboral ahora? Esto desbloqueará el sistema para todos.")) return;
        setSubmitting(true);
        try {
            await axios.post('/api/shifts/start');
            await fetchCurrentShift();
            alert("Jornada iniciada con éxito");
        } catch (error) {
            console.error("Error starting shift", error);
            alert("No se pudo iniciar la jornada.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEndShift = async () => {
        if (submitting) return;
        if (!confirm("¿Deseas finalizar la jornada laboral? El sistema se bloqueara para los usuarios.")) return;
        setSubmitting(true);
        try {
            // Obtener resumen ANTES de cerrar para mostrarlo
            const shiftId = currentShift?.id;
            await axios.post('/api/shifts/end');

            if (shiftId) {
                try {
                    const { data: summary } = await axios.get(`/api/shifts/${shiftId}/summary`);
                    setShiftReport(summary);
                } catch {
                    // Si falla el resumen, no bloquear el cierre
                }
            }

            fetchCurrentShift();
        } catch (error) {
            console.error("Error ending shift", error);
            alert("No se pudo finalizar la jornada.");
        } finally {
            setSubmitting(false);
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
        if (submitting) return;
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

        setSubmitting(true);
        try {
            await axios.patch(`/api/orders/${order.id}/pay`, {
                detail_ids: selectedIds
            });

            // Refrescar órdenes para ver si la orden se cerró o se dividió, y las métricas
            await Promise.all([fetchServedOrders(), fetchMetrics()]);
            alert('Cobro registrado exitosamente');
        } catch (error) {
            console.error("Error procesando el pago", error);
            alert("Ocurrió un error al procesar el pago.");
        } finally {
            setSubmitting(false);
        }
    };

    const calculateSelectedTotal = (order) => {
        const selectedIds = selectedItemsByOrder[order.id] || [];
        return order.details
            .filter(d => selectedIds.includes(d.id))
            .reduce((sum, d) => sum + parseFloat(d.subtotal), 0)
            .toFixed(2);
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
            isLate: diffInMinutes >= 20 // Se vuelve rojo a los 20 min como en Cocina
        };
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center font-bold text-slate-400">Generando Tablero...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-10">
            <header className="max-w-6xl mx-auto mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800">Caja y Facturación</h1>
                    <div className="flex items-center mt-1 gap-3 flex-wrap">
                        <span className={`h-2.5 w-2.5 rounded-full ${currentShift?.id ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                        <p className="text-xs md:text-sm text-slate-500 font-medium">
                            {currentShift?.id
                                ? `Jornada iniciada a las ${currentShift.start_time
                                    ? new Date(currentShift.start_time.replace(' ', 'T') + (currentShift.start_time.includes('+') ? '' : '-05:00'))
                                        .toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit' })
                                    : '---'}`
                                : 'Jornada Cerrada'}
                        </p>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            🇪🇨 {currentTime.toLocaleString('es-EC', {
                                timeZone: 'America/Guayaquil',
                                weekday: 'short', day: '2-digit', month: 'short',
                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    {!currentShift?.id ? (
                        <button
                            onClick={handleStartShift}
                            disabled={submitting}
                            className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-green-200 transition-all flex items-center justify-center ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            {submitting ? 'INICIANDO...' : 'INICIAR JORNADA'}
                        </button>
                    ) : (
                        <button
                            onClick={handleEndShift}
                            disabled={submitting}
                            className={`bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-6 rounded-xl border border-red-200 transition-all flex items-center justify-center ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            {submitting ? 'CERRANDO...' : 'FINALIZAR JORNADA'}
                        </button>
                    )}
                    <Link to="/" className="text-center text-sm font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                        &larr; Volver al Menú
                    </Link>
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            disabled={submitting}
                            className={`text-sm font-semibold text-rose-600 hover:text-rose-800 px-4 py-2 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {submitting ? 'Procesando...' : 'Cerrar Turno'}
                        </button>
                    )}
                </div>
            </header>

            {/* ======== PANEL DE LLAMADAS A MESERO ======== */}
            {callingTables.length > 0 && (
                <div className="max-w-6xl mx-auto mb-6">
                    <div className="bg-violet-600 rounded-2xl p-5 shadow-xl shadow-violet-200 border border-violet-500">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="relative flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                            </span>
                            <h2 className="text-white font-black text-lg tracking-tight">
                                🔔 {callingTables.length === 1
                                    ? '1 Mesa está llamando un mesero'
                                    : `${callingTables.length} Mesas están llamando un mesero`}
                            </h2>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {callingTables.map(table => (
                                <div key={table.id} className="flex items-center gap-3 bg-white/15 backdrop-blur border border-white/25 rounded-xl px-4 py-3">
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">Mesa {table.number}</p>
                                        <p className="text-violet-200 text-xs font-semibold mt-0.5">Esperando mesero...</p>
                                    </div>
                                    <button
                                        onClick={() => handleDismissWaiter(table.id)}
                                        disabled={submitting}
                                        className={`ml-2 bg-white text-violet-700 hover:bg-violet-50 font-black text-sm px-4 py-2 rounded-lg shadow transition-all whitespace-nowrap ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {submitting ? '...' : 'Enviar Mesero ✓'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
                        const { text: timeText, isLate } = getWaitTime(order.created_at);

                        return (
                            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                                <div className={`px-6 py-4 flex justify-between items-center text-white transition-colors duration-500 ${isLate ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'}`}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-xl">Mesa {order.table?.number}</h3>
                                            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isLate ? 'bg-rose-500 text-white animate-bounce' : 'bg-amber-400/50 text-amber-50'}`}>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                {timeText}
                                            </span>
                                        </div>
                                        <p className={`${isLate ? 'text-rose-100' : 'text-amber-100'} text-xs font-semibold uppercase tracking-wider`}>Orden #{order.id}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-sm border shadow-sm
                                        ${order.status === 'pendiente' ? 'bg-white/90 text-slate-800 border-white/50' :
                                            order.status === 'en_preparacion' ? 'bg-amber-100/90 text-amber-800 border-amber-200' :
                                                order.status === 'listo' ? 'bg-blue-100/90 text-blue-800 border-blue-200' :
                                                    'bg-green-100/90 text-green-800 border-green-200'}
                                    `}>
                                        {order.status === 'pendiente' ? 'Esperando Cocina 🕒' :
                                            order.status === 'en_preparacion' ? 'Preparando 🍳' :
                                                order.status === 'listo' ? 'En Barra 🏃‍♂️' : 'En Mesa / Listo para Cobro'}
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
                                        disabled={!hasSelection || submitting}
                                        className={`w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all flex justify-center items-center ${submitting ? 'animate-pulse' : ''}`}>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        {submitting ? 'PROCESANDO COBRO...' : (isAllSelected ? 'Cobrar y Liberar Mesa' : 'Cobrar Selección')}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL: REPORTE DE CIERRE DE JORNADA */}
            {shiftReport && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-100">
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">📊</div>
                            <h2 className="text-2xl font-black text-slate-800">Resumen del Día</h2>
                            <p className="text-slate-500 text-sm mt-1">Jornada finalizada exitosamente</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
                                <p className="text-2xl font-black text-emerald-700">${shiftReport.total_revenue}</p>
                                <p className="text-xs font-semibold text-emerald-600 mt-1">Total Cobrado</p>
                            </div>
                            <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                                <p className="text-2xl font-black text-blue-700">{shiftReport.total_orders}</p>
                                <p className="text-xs font-semibold text-blue-600 mt-1">Órdenes</p>
                            </div>
                            <div className="bg-purple-50 rounded-2xl p-4 text-center border border-purple-100">
                                <p className="text-2xl font-black text-purple-700">{shiftReport.tables_served}</p>
                                <p className="text-xs font-semibold text-purple-600 mt-1">Mesas</p>
                            </div>
                        </div>

                        {shiftReport.top_products?.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">🏆 Top Productos</h3>
                                <div className="space-y-2">
                                    {shiftReport.top_products.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-700 font-medium">
                                                <span className="text-slate-400 mr-2">#{i + 1}</span>{p.name}
                                            </span>
                                            <span className="font-bold text-slate-600">x{p.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setShiftReport(null)}
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl transition-all"
                        >
                            Cerrar Reporte
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashierView;
