import React from 'react';
import { Link } from 'react-router-dom';

const HomeSelection = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 md:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full mb-8 md:mb-10 text-center">
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-tight md:leading-normal">
                    Sistema de Restaurante
                </h1>
                <p className="mt-2 text-base md:text-lg text-gray-500 font-medium px-4 md:px-0">
                    Seleccione su área de trabajo interactiva
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:gap-6 sm:grid-cols-2 max-w-4xl w-full">
                {/* Botón Mesero */}
                <Link to="/mesero" className="group flex flex-col items-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-xl hover:border-blue-200">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Mesero</h3>
                    <p className="text-sm text-gray-400 mt-2 text-center">Tomar pedidos de clientes en las mesas.</p>
                </Link>

                {/* Botón Cocina */}
                <Link to="/cocina" className="group flex flex-col items-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-xl hover:border-orange-200">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Cocina</h3>
                    <p className="text-sm text-gray-400 mt-2 text-center">Visualizar las comandas entrantes y prepararlas.</p>
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
