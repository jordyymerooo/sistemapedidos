import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const HomeSelection = () => {
    const [metrics, setMetrics] = useState({
        tables_free: 0,
        tables_occupied: 0,
        orders_pending: 0,
        orders_served: 0
    });
    const [initialCheck, setInitialCheck] = useState(true);
    const [shiftActive, setShiftActive] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [metricsRes, shiftRes] = await Promise.all([
                    axios.get('/api/metrics'),
                    axios.get('/api/shifts/current')
                ]);
                const data = metricsRes.data;
                setMetrics({
                    tables_free: data.tables?.free || 0,
                    tables_occupied: data.tables?.occupied || 0,
                    orders_pending: data.orders?.pending || 0,
                    orders_served: data.orders?.served || 0
                });
                setShiftActive(!!shiftRes.data);
            } catch (error) {
                console.error("Error fetching home data", error);
            } finally {
                setInitialCheck(false);
            }
        };
        fetchData();
        const intervalId = setInterval(fetchData, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'BUENOS DÍAS';
        if (hour < 18) return 'BUENAS TARDES';
        return 'BUENAS NOCHES';
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 md:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full mb-8 text-center">
                <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">{getGreeting()}</span>
                {initialCheck ? (
                    // Pantalla de carga neutral: no muestra estado de jornada hasta saber la respuesta real
                    <div className="mt-4 flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-3"></div>
                        <p className="text-sm text-slate-400 font-semibold animate-pulse">Verificando sistema...</p>
                    </div>
                ) : (
                    <>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-1 mb-2">
                            {shiftActive ? '¿Qué módulo necesitas?' : 'SISTEMA CERRADO'}
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            {shiftActive
                                ? 'Selecciona tu área para acceder a los módulos'
                                : 'La jornada laboral aún no ha sido iniciada por Caja.'}
                        </p>
                        {!shiftActive && (
                            <div className="mt-4 inline-flex items-center gap-2 text-rose-600 font-bold bg-rose-50 px-4 py-2 rounded-full border border-rose-100 animate-pulse">
                                🔒 Acceso restringido a módulos operativos
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Tarjetas de Estadísticas Top */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-8">
                {/* 1 */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div className="flex items-center text-emerald-500 mb-2">
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <span className="text-2xl font-black text-slate-800">{metrics.tables_free}</span>
                    <span className="text-xs font-semibold text-slate-500 mt-1">Mesas disponibles</span>
                </div>
                {/* 2 */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div className="flex items-center text-rose-500 mb-2">
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5V10H2v10h5m10 0v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5m10 0H7"></path></svg>
                    </div>
                    <span className="text-2xl font-black text-slate-800">{metrics.tables_occupied}</span>
                    <span className="text-xs font-semibold text-slate-500 mt-1">Mesas ocupadas</span>
                </div>
                {/* 3 */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div className="flex items-center text-amber-500 mb-2">
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15"></path></svg>
                    </div>
                    <span className="text-2xl font-black text-slate-800">{metrics.orders_pending}</span>
                    <span className="text-xs font-semibold text-slate-500 mt-1">En cocina</span>
                </div>
                {/* 4 */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div className="flex items-center text-blue-500 mb-2">
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <span className="text-2xl font-black text-slate-800">{metrics.orders_served}</span>
                    <span className="text-xs font-semibold text-slate-500 mt-1">Mesas por cobrar</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:gap-6 sm:grid-cols-2 max-w-4xl w-full">
                {/* Botón Mesero */}
                <Link to="/mesero" className={`group flex flex-col items-center p-8 rounded-2xl shadow-sm border transition-all ${!shiftActive ? 'bg-slate-50 border-slate-200 grayscale' : 'bg-white border-gray-100 hover:shadow-xl hover:border-blue-200'}`}>
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full mb-4 transition-transform ${!shiftActive ? 'bg-slate-200 text-slate-400' : 'bg-blue-100 text-blue-600 group-hover:scale-110'}`}>
                        {shiftActive ? (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        ) : (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Mesero</h3>
                    <p className="text-sm text-gray-400 mt-2 text-center">
                        {shiftActive ? 'Tomar pedidos de clientes en las mesas.' : 'Módulo bloqueado temporalmente.'}
                    </p>
                </Link>

                {/* Botón Cocina */}
                <Link to="/cocina" className={`group flex flex-col items-center p-8 rounded-2xl shadow-sm border transition-all ${!shiftActive ? 'bg-slate-50 border-slate-200 grayscale' : 'bg-white border-gray-100 hover:shadow-xl hover:border-orange-200'}`}>
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full mb-4 transition-transform ${!shiftActive ? 'bg-slate-200 text-slate-400' : 'bg-orange-100 text-orange-600 group-hover:scale-110'}`}>
                        {shiftActive ? (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"></path></svg>
                        ) : (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Cocina</h3>
                    <p className="text-sm text-gray-400 mt-2 text-center">
                        {shiftActive ? 'Visualizar las comandas entrantes y prepararlas.' : 'Módulo bloqueado temporalmente.'}
                    </p>
                </Link>

                {/* Botón Caja */}
                <Link to="/caja" className="group flex flex-col items-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-xl hover:border-green-200">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Caja</h3>
                    <p className="text-sm text-gray-400 mt-2 text-center">Cobrar pedidos y gestionar la facturación.</p>
                </Link>

                {/* Botón Panel Admin */}
                <Link to="/admin" className="group flex flex-col items-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-xl hover:border-purple-200">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Dashboard Admin</h3>
                    <p className="text-sm text-gray-400 mt-2 text-center">Estadísticas en tiempo real del restaurante.</p>
                </Link>
            </div>
        </div>
    );
};

export default HomeSelection;
