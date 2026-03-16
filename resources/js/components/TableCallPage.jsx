import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

/**
 * TableCallPage — Página dedicada para colocar en la tablet de cada mesa.
 * URL: /mesa/:tableId
 * El cliente presiona el botón grande para llamar al mesero.
 * Caja recibe la notificación y despacha al mesero.
 */
const TableCallPage = () => {
    const { tableId } = useParams();
    const [table, setTable] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | calling | called | dismissed
    const [loading, setLoading] = useState(true);
    const [shiftActive, setShiftActive] = useState(false);

    // Obtener estado actual de la mesa
    const fetchTable = async () => {
        try {
            const [tablesRes, shiftRes] = await Promise.all([
                axios.get('/api/tables'),
                axios.get('/api/shifts/current'),
            ]);
            const found = tablesRes.data.find(t => String(t.id) === String(tableId));
            setTable(found || null);
            setShiftActive(!!shiftRes.data?.id);

            // Sincronizar estado visual con la base de datos
            if (found?.needs_waiter) {
                setStatus('called');
            } else if (status === 'called') {
                // La caja ya despachó al mesero
                setStatus('dismissed');
                setTimeout(() => setStatus('idle'), 4000);
            }
        } catch (err) {
            console.error('Error fetching table data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTable();
        const interval = setInterval(fetchTable, 5000);
        return () => clearInterval(interval);
    }, [tableId]);

    const handleCallWaiter = async () => {
        if (status === 'calling' || status === 'called') return;
        setStatus('calling');
        try {
            await axios.patch(`/api/tables/${tableId}/call-waiter`);
            setStatus('called');
        } catch (err) {
            console.error('Error calling waiter', err);
            setStatus('idle');
            alert('No se pudo enviar la solicitud. Intenta de nuevo.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!shiftActive) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
                <div className="text-7xl mb-6">🔒</div>
                <h1 className="text-3xl font-black text-white mb-3">Restaurante Cerrado</h1>
                <p className="text-slate-400 font-medium text-lg">El servicio aún no ha comenzado.</p>
            </div>
        );
    }

    if (!table) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
                <div className="text-7xl mb-6">❓</div>
                <h1 className="text-3xl font-black text-white">Mesa no encontrada</h1>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 select-none">

            {/* Identificador de mesa */}
            <div className="mb-10 text-center">
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-sm mb-2">Mesa</p>
                <div className="text-[8rem] font-black text-white leading-none">{table.number}</div>
            </div>

            {/* Botón principal */}
            {status === 'idle' && (
                <button
                    onClick={handleCallWaiter}
                    className="w-64 h-64 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 shadow-[0_0_60px_rgba(245,158,11,0.5)] hover:shadow-[0_0_80px_rgba(245,158,11,0.7)] transition-all duration-200 flex flex-col items-center justify-center gap-4 border-8 border-amber-300/30"
                >
                    <span className="text-7xl">🔔</span>
                    <span className="text-white font-black text-2xl tracking-wide text-center leading-tight">
                        LLAMAR<br />MESERO
                    </span>
                </button>
            )}

            {status === 'calling' && (
                <div className="w-64 h-64 rounded-full bg-amber-500/50 border-8 border-amber-400/50 flex flex-col items-center justify-center gap-4 animate-pulse">
                    <span className="text-7xl">⏳</span>
                    <span className="text-white font-black text-xl">Enviando...</span>
                </div>
            )}

            {status === 'called' && (
                <div className="w-64 h-64 rounded-full bg-green-500/20 border-8 border-green-400/50 flex flex-col items-center justify-center gap-4 shadow-[0_0_60px_rgba(34,197,94,0.3)]">
                    <span className="text-7xl animate-bounce">👨‍🍳</span>
                    <span className="text-green-300 font-black text-xl text-center leading-tight">
                        ¡Mesero<br />en camino!
                    </span>
                </div>
            )}

            {status === 'dismissed' && (
                <div className="w-64 h-64 rounded-full bg-blue-500/20 border-8 border-blue-400/50 flex flex-col items-center justify-center gap-4">
                    <span className="text-7xl">✅</span>
                    <span className="text-blue-300 font-black text-xl text-center leading-tight">
                        ¡Un mesero<br />viene hacia ti!
                    </span>
                </div>
            )}

            {/* Indicador de estado inferior */}
            <div className="mt-12 text-center">
                {status === 'idle' && (
                    <p className="text-slate-500 font-medium text-base">Toca el botón si necesitas ayuda</p>
                )}
                {status === 'called' && (
                    <p className="text-slate-400 font-medium text-base animate-pulse">
                        Solicitud enviada — espera un momento
                    </p>
                )}
                {status === 'dismissed' && (
                    <p className="text-slate-400 font-medium text-base">
                        Espera, alguien está en camino 🏃‍♂️
                    </p>
                )}
            </div>

            {/* Marca del restaurante */}
            <div className="absolute bottom-6 text-slate-700 text-xs font-semibold tracking-widest uppercase">
                Sistema de Pedidos
            </div>
        </div>
    );
};

export default TableCallPage;
