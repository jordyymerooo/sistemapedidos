import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const RoleLogin = ({ roleName, roleLabel, onLogin }) => {
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialCheck, setInitialCheck] = useState(true); // Para evitar el parpadeo del formulario
    const [shiftActive, setShiftActive] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersRes, shiftRes] = await Promise.all([
                    axios.get('/api/users'),
                    axios.get('/api/shifts/current')
                ]);
                setUsers(usersRes.data.filter(u => u.role === roleName));
                setShiftActive(!!shiftRes.data);
            } catch (err) {
                console.error("Error cargando datos de login", err);
            } finally {
                setInitialCheck(false);
            }
        };
        fetchData();
    }, [roleName]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (loading) return;
        setError('');

        if (!selectedUserId || !password) {
            setError('Selecciona un usuario e ingresa tu PIN');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('/api/login', {
                user_id: selectedUserId,
                password: password,
                role: roleName // Obligamos a que el endpoint verifique que su rol permita esta vista
            });

            // Login correcto
            onLogin(response.data.user);

        } catch (err) {
            // El backend devuelve 401 para PIN incorrecto o 403 para Rol incorrecto
            if (err.response && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Error de conexión o credenciales.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso a {roleLabel}</h2>

                {initialCheck ? (
                    <div className="py-10 flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-sm text-slate-500 font-bold animate-pulse">Verificando estado del sistema...</p>
                    </div>
                ) : (!shiftActive && (roleName === 'mesero' || roleName === 'cocinero')) ? (
                    <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700">
                        <div className="text-3xl mb-2">🔒</div>
                        <p className="font-bold text-sm">JORNADA CERRADA</p>
                        <p className="text-xs mt-1">No puedes iniciar turno hasta que Caja abra el día.</p>
                        <button
                            onClick={() => navigate('/')}
                            className="mt-4 w-full bg-rose-600 text-white font-bold py-2 rounded-lg text-xs"
                        >
                            Regresar
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-slate-500 mb-8">Selecciona tu perfil e ingresa tu PIN para comenzar tu turno.</p>

                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                            <div className="text-left">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                <select
                                    className="w-full border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                >
                                    <option value="">Selecciona tu nombre...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="text-left">
                                <label className="block text-sm font-medium text-slate-700 mb-1">PIN / Contraseña</label>
                                <input
                                    type="password"
                                    className="w-full border-slate-200 rounded-lg text-center tracking-[0.5em] focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="****"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all active:scale-95 disabled:opacity-50 mt-4"
                            >
                                {loading ? 'Verificando...' : 'Iniciar Turno'}
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="w-full text-slate-500 text-sm font-medium py-2 hover:text-slate-800"
                            >
                                Volver al Menú Principal
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default RoleLogin;
