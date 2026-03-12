import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const WaiterDashboard = ({ activeWaiter, onLogout }) => {
    const [tables, setTables] = useState([]);
    const [readyOrders, setReadyOrders] = useState([]); // Comandas en barra esperando
    const [loading, setLoading] = useState(true);
    const [showCleaningModal, setShowCleaningModal] = useState(false);
    const [showReadyModal, setShowReadyModal] = useState(false); // Modal comandas
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();
        const intervalId = setInterval(fetchDashboardData, 10000); // Polling cada 10s
        return () => clearInterval(intervalId);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [tablesRes, readyRes] = await Promise.all([
                axios.get('/api/tables'),
                axios.get('/api/orders/ready')
            ]);
            setTables(tablesRes.data);
            setReadyOrders(readyRes.data);
        } catch (error) {
            console.error("Error fetching dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCleanTable = async (tableId) => {
        try {
            await axios.patch(`/api/tables/${tableId}`, { needs_cleaning: false });
            fetchDashboardData();
            const remainingDirty = dirtyTables.filter(t => t.id !== tableId);
            if (remainingDirty.length === 0) setShowCleaningModal(false);
        } catch (error) {
            console.error("Error marcando la mesa como limpia", error);
        }
    };

    const handleDeliverOrder = async (orderId) => {
        try {
            await axios.patch(`/api/orders/${orderId}/deliver`);
            fetchDashboardData();
            const remainingReady = readyOrders.filter(o => o.id !== orderId);
            if (remainingReady.length === 0) setShowReadyModal(false);
        } catch (error) {
            console.error("Error despachando orden a la mesa", error);
        }
    };

    const handleTableClick = (table) => {
        if (table.needs_cleaning) {
            setShowCleaningModal(true);
            return;
        }

        // Navegar a la toma de pedidos o vista de mesa
        navigate(`/mesero/pedido/${table.id}`);
    };

    const dirtyTables = tables.filter(t => t.needs_cleaning);

    if (loading) {
        return <div className="flex h-screen items-center justify-center font-bold text-slate-400">Cargando Mapa del Salón...</div>;
    }

    // Definición de Colores del Semáforo de Mesas
    const getTableStyle = (table) => {
        if (table.needs_cleaning) {
            // Requiere Limpieza (Amarillo Suave)
            return "bg-amber-50 border-amber-300 text-amber-600 hover:shadow-amber-100 ring-amber-400";
        }
        if (table.status === 'libre') {
            // Disponible / Libre (Verde)
            return "bg-emerald-50 border-emerald-300 text-emerald-600 hover:shadow-emerald-100 ring-emerald-400";
        }
        if (table.status === 'ocupada') {
            // Ocupada (Rojo o Naranja basado en la imagen)
            // Según la imagen, Libre es Verde, Ocupada (pidiendo/comiendo) podría sugerir Rojo/Pastel
            return "bg-rose-50 border-rose-300 text-rose-600 hover:shadow-rose-100 ring-rose-400";
        }

        // Fallback default
        return "bg-white border-slate-200 text-slate-600";
    };

    const getTableIcon = (table) => {
        if (table.needs_cleaning) return "🧹";
        if (table.status === 'libre') return "✅";
        if (table.status === 'ocupada') return "🍽️";
        return "📍";
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-6">
            <header className="mb-6 flex flex-col space-y-4 md:space-y-0 md:flex-row items-start md:items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-2">
                        📋 Módulo Mesero
                    </h1>
                    <p className="text-sm text-slate-500 font-medium tracking-tight mt-1">
                        Atendiendo: <span className="text-blue-600 font-bold ml-1">{activeWaiter?.name || 'Mesero'}</span>
                    </p>
                </div>

                <div className="flex w-full md:w-auto items-center gap-3">
                    {/* Botón Comandas en Barra */}
                    <button
                        onClick={() => readyOrders.length > 0 && setShowReadyModal(true)}
                        className={`relative flex items-center justify-center h-10 w-10 text-slate-600 focus:outline-none transition-colors ${readyOrders.length > 0 ? 'text-blue-600 hover:text-blue-800 animate-bounce' : 'hover:text-amber-600'}`}
                        title="Comandas Listas"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"></path></svg>
                        {readyOrders.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-blue-500 text-white text-[10px] font-bold ring-2 ring-white">
                                {readyOrders.length}
                            </span>
                        )}
                    </button>

                    {/* Botón Mesas Sucias */}
                    <button
                        onClick={() => dirtyTables.length > 0 && setShowCleaningModal(true)}
                        className="relative flex items-center justify-center h-10 w-10 text-slate-600 hover:text-amber-600 focus:outline-none transition-colors"
                        title="Limpieza Pendiente"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        {dirtyTables.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold ring-2 ring-white">
                                {dirtyTables.length}
                            </span>
                        )}
                    </button>

                    <Link to="/" className="flex-1 md:flex-none text-center text-sm font-semibold text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                        &larr; Volver
                    </Link>
                    {onLogout && (
                        <button onClick={onLogout} className="flex-1 md:flex-none text-sm font-semibold text-rose-600 hover:text-rose-800 px-4 py-2 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors">
                            Cerrar Turno
                        </button>
                    )}
                </div>
            </header>

            {/* Leyenda de Estados */}
            <div className="mb-6 flex flex-wrap gap-4 text-xs font-bold text-slate-500 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm border border-emerald-500"></span> Disponible</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-400 shadow-sm border border-rose-500"></span> Ocupada / Esperando</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-300 shadow-sm border border-amber-400"></span> Requiere limpieza</div>
            </div>

            {/* Mapa de Mesas (Grid View) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 w-full max-w-7xl mx-auto flex-grow content-start">
                {tables.map(table => (
                    <button
                        key={table.id}
                        onClick={() => handleTableClick(table)}
                        className={`
                            relative flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 shadow-sm transition-all hover:scale-[1.03] active:scale-95 focus:outline-none focus:ring-4 focus:ring-offset-2 w-full aspect-square
                            ${getTableStyle(table)}
                        `}
                    >
                        <span className="text-2xl mb-2">{getTableIcon(table)}</span>
                        <span className="text-3xl font-black mb-1">{table.number}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                            {table.needs_cleaning ? 'Sucia' : table.status}
                        </span>
                    </button>
                ))}
            </div>

            {/* MODAL CAMPANITA */}
            {showCleaningModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col p-6 relative">
                        <button
                            onClick={() => setShowCleaningModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                        <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                            <span className="text-2xl">🧹</span> Tareas de Limpieza
                        </h2>
                        <p className="text-sm text-slate-500 mb-6 font-medium border-b border-slate-100 pb-4">
                            Las siguientes mesas requieren limpieza para recibir a nuevos clientes.
                        </p>

                        <ul className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                            {dirtyTables.map(table => (
                                <li key={table.id} className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-amber-900">Mesa {table.number}</span>
                                        <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Sucia</span>
                                    </div>
                                    <button
                                        onClick={() => handleCleanTable(table.id)}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow shadow-amber-200 transition-all"
                                    >
                                        Ya Limpié ✓
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <button onClick={() => setShowCleaningModal(false)} className="w-full text-center text-sm font-bold text-slate-600 hover:text-slate-800 py-3 rounded-xl bg-slate-100 transition-colors">
                            Cerrar Ventana
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL COMANDAS EN BARRA (LISTAS PARA SERVIR) */}
            {showReadyModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col p-6 relative">
                        <button
                            onClick={() => setShowReadyModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                        <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                            <span className="text-2xl">🏃‍♂️💨</span> Entregas Pendientes
                        </h2>
                        <p className="text-sm text-slate-500 mb-4 font-medium border-b border-slate-100 pb-4">
                            Busca estas bandejas en la barra de cocina y llévalas a la mesa.
                        </p>

                        <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-1">
                            {readyOrders.map(order => (
                                <div key={order.id} className="border border-blue-100 bg-blue-50/50 rounded-xl overflow-hidden flex flex-col">
                                    <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center text-sm font-bold">
                                        <span>Mesa {order.table?.number}</span>
                                        <span className="text-xs bg-white text-blue-600 px-2 py-0.5 rounded-full shadow-inner">{order.details.length} Platos</span>
                                    </div>
                                    <div className="p-3">
                                        <ul className="text-sm text-slate-700 font-semibold mb-3 space-y-1">
                                            {order.details.map(detail => (
                                                <li key={detail.id} className="flex justify-between border-b border-blue-100/50 pb-1">
                                                    <span>- {detail.product?.name}</span>
                                                    <span className="text-blue-500">x{detail.quantity}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            onClick={() => handleDeliverOrder(order.id)}
                                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs md:text-sm rounded-lg shadow shadow-blue-200 transition-all uppercase tracking-wider"
                                        >
                                            Lo llevé a la mesa ✓
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setShowReadyModal(false)} className="w-full text-center text-sm font-bold text-slate-600 hover:text-slate-800 py-3 rounded-xl bg-slate-100 transition-colors mt-auto">
                            Ocultar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaiterDashboard;
