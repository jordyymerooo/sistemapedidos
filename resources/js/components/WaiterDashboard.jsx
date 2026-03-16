import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const WaiterDashboard = ({ activeWaiter, onLogout }) => {
    const [tables, setTables] = useState([]);
    const [readyOrders, setReadyOrders] = useState([]); // Comandas en barra esperando
    const [loading, setLoading] = useState(true);
    const [initialCheck, setInitialCheck] = useState(true);
    const [shiftActive, setShiftActive] = useState(false); // Por seguridad, empezamos en falso
    const [showCleaningModal, setShowCleaningModal] = useState(false);
    const [showReadyModal, setShowReadyModal] = useState(false);
    // Registra en qué momento se detectó cada mesa como sucia por primera vez
    const [dirtyTimestamps, setDirtyTimestamps] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const clockId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(clockId);
    }, []);

    useEffect(() => {
        fetchDashboardData();
        const intervalId = setInterval(fetchDashboardData, 5000); // Polling cada 5s para máxima velocidad
        return () => clearInterval(intervalId);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [tablesRes, readyRes, shiftRes] = await Promise.all([
                axios.get('/api/tables'),
                axios.get('/api/orders/ready'),
                axios.get('/api/shifts/current')
            ]);

            const fetchedTables = tablesRes.data;
            setTables(fetchedTables);
            setShiftActive(!!shiftRes.data);

            // --- AUTO-LIMPIEZA DE MESAS SUCIAS (7 MINUTOS) ---
            const now = Date.now();
            const AUTO_CLEAN_MS = 7 * 60 * 1000; // 7 minutos

            setDirtyTimestamps(prevTimestamps => {
                const updatedTimestamps = { ...prevTimestamps };
                const tablesToAutoClean = [];

                fetchedTables.forEach(table => {
                    if (table.needs_cleaning) {
                        if (!updatedTimestamps[table.id]) {
                            // Mesa recién detectada como sucia: registrar timestamp
                            updatedTimestamps[table.id] = now;
                        } else if (now - updatedTimestamps[table.id] >= AUTO_CLEAN_MS) {
                            // Han pasado 7 minutos: marcar para auto-limpiar
                            tablesToAutoClean.push(table.id);
                            delete updatedTimestamps[table.id];
                        }
                    } else {
                        // Mesa ya no está sucia: limpiar su timestamp
                        delete updatedTimestamps[table.id];
                    }
                });

                // Lanzar auto-limpieza en background sin bloquear el render
                if (tablesToAutoClean.length > 0) {
                    tablesToAutoClean.forEach(tableId => {
                        axios.patch(`/api/tables/${tableId}`, { needs_cleaning: false })
                            .catch(err => console.error(`Auto-limpieza fallida para mesa ${tableId}`, err));
                    });
                }

                return updatedTimestamps;
            });

            // Filtrar órdenes que el mesero ya marcó como leídas localmente
            const dismissed = JSON.parse(localStorage.getItem('dismissedOrders') || '[]');
            setReadyOrders(readyRes.data.filter(o => !dismissed.includes(o.id)));
        } catch (error) {
            console.error("Error fetching dashboard data", error);
        } finally {
            setLoading(false);
            setInitialCheck(false);
        }
    };

    const handleDismissOrder = (orderId) => {
        const dismissed = JSON.parse(localStorage.getItem('dismissedOrders') || '[]');
        if (!dismissed.includes(orderId)) {
            dismissed.push(orderId);
            localStorage.setItem('dismissedOrders', JSON.stringify(dismissed));
        }
        setReadyOrders(prev => prev.filter(o => o.id !== orderId));

        // Ocultar modal si ya no quedan notificaciones de ningún tipo
        if (readyOrders.length <= 1 && dirtyTables.length === 0) {
            setShowCleaningModal(false);
        }
    };

    const handleCleanTable = async (tableId) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await axios.patch(`/api/tables/${tableId}`, { needs_cleaning: false });
            // Limpiar timestamp local de esta mesa
            setDirtyTimestamps(prev => {
                const updated = { ...prev };
                delete updated[tableId];
                return updated;
            });
            await fetchDashboardData();
            const remainingDirty = tables.filter(t => t.needs_cleaning && t.id !== tableId);
            if (remainingDirty.length === 0) setShowCleaningModal(false);
        } catch (error) {
            console.error("Error marcando la mesa como limpia", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeliverOrder = async (orderId) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await axios.patch(`/api/orders/${orderId}/deliver`);
            await fetchDashboardData();
            const remainingReady = readyOrders.filter(o => o.id !== orderId);
            if (remainingReady.length === 0) setShowReadyModal(false);
        } catch (error) {
            console.error("Error despachando orden a la mesa", error);
        } finally {
            setIsProcessing(false);
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

    if (initialCheck || (loading && tables.length === 0)) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-slate-400 animate-pulse">Sincronizando con el sistema...</p>
            </div>
        );
    }

    if (!shiftActive) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white/10 backdrop-blur-xl p-10 rounded-[3rem] border border-white/20 shadow-2xl max-w-md">
                    <div className="text-6xl mb-6 animate-bounce">🔒</div>
                    <h2 className="text-3xl font-black text-white mb-4">SISTEMA CERRADO</h2>
                    <p className="text-slate-300 font-medium mb-8 leading-relaxed">
                        La jornada laboral aún no ha sido iniciada.
                        Por favor, espera a que <span className="text-amber-400 font-bold">Caja</span> active el servicio del día.
                    </p>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 animate-[loading_2s_infinite]"></div>
                    </div>
                    <style>{`
                        @keyframes loading {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(100%); }
                        }
                    `}</style>
                </div>
                {onLogout && (
                    <button onClick={onLogout} className="mt-8 text-slate-400 hover:text-white font-bold transition-colors">
                        ← Cerrar sesión de mesero
                    </button>
                )}
            </div>
        );
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
                    <span className="mt-1 inline-block text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        🇪🇨 {currentTime.toLocaleString('es-EC', {
                            timeZone: 'America/Guayaquil',
                            weekday: 'short', day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                    </span>
                </div>

                <div className="flex w-full md:w-auto items-center gap-3">
                    {/* Botón de Notificaciones Unificadas (Mesas Sucias + Comandas Listas) */}
                    <button
                        onClick={() => (dirtyTables.length > 0 || readyOrders.length > 0) && setShowCleaningModal(true)}
                        className={`relative flex items-center justify-center h-10 w-10 text-slate-600 focus:outline-none transition-colors ${readyOrders.length > 0 ? 'text-blue-600 hover:text-blue-800 animate-bounce' : 'hover:text-amber-600'}`}
                        title="Notificaciones"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        {(dirtyTables.length > 0 || readyOrders.length > 0) && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold ring-2 ring-white">
                                {dirtyTables.length + readyOrders.length}
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
                            <span className="text-2xl">🔔</span> Notificaciones
                        </h2>
                        <p className="text-sm text-slate-500 mb-6 font-medium border-b border-slate-100 pb-4">
                            Alertas y novedades en el salón.
                        </p>

                        <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto">
                            {/* SECCIÓN COMANDAS RECIENTES */}
                            {readyOrders.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-wider mb-2">Comandas Listas (Desaparecen solas)</h3>
                                    {readyOrders.map(order => (
                                        <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50 gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">🏃‍♂️💨</span>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-blue-900">Mesa {order.table?.number}</span>
                                                    <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest">Lista en barra</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDismissOrder(order.id)}
                                                disabled={isProcessing}
                                                className={`px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-lg shadow shadow-blue-200 transition-all whitespace-nowrap ${isProcessing ? 'opacity-50' : ''}`}
                                            >
                                                Entendido ✓
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* SECCIÓN MESAS SUCIAS */}
                            {dirtyTables.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-amber-600 uppercase tracking-wider mb-2 mt-4">Mesas por Limpiar</h3>
                                    <ul className="space-y-2">
                                        {dirtyTables.map(table => (
                                            <li key={table.id} className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-amber-900">Mesa {table.number}</span>
                                                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Sucia</span>
                                                </div>
                                                <button
                                                    onClick={() => handleCleanTable(table.id)}
                                                    disabled={isProcessing}
                                                    className={`px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow shadow-amber-200 transition-all ${isProcessing ? 'opacity-50' : ''}`}
                                                >
                                                    {isProcessing ? '...' : 'Ya Limpié ✓'}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <button onClick={() => setShowCleaningModal(false)} className="w-full text-center text-sm font-bold text-slate-600 hover:text-slate-800 py-3 rounded-xl bg-slate-100 transition-colors">
                            Cerrar Ventana
                        </button>
                    </div>
                </div>
            )}


        </div >
    );
};

export default WaiterDashboard;
