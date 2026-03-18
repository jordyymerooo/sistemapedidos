import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const AdminView = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('tables');

    // CRUD States
    const [tables, setTables] = useState([]);
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [alerts, setAlerts] = useState({ count: 0, alerts: [] });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedShiftSummary, setSelectedShiftSummary] = useState(null);
    const [showShiftReportModal, setShowShiftReportModal] = useState(false);

    // Form States
    const [newTableNum, setNewTableNum] = useState('');
    const [selectedLocationId, setSelectedLocationId] = useState('');
    const [newLocationName, setNewLocationName] = useState('');
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'mesero' });
    const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: 0, category_id: '' });
    const [editingProduct, setEditingProduct] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    useEffect(() => {
        const clockId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(clockId);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'tables') {
                const [tablesRes, locationsRes] = await Promise.all([
                    axios.get('/api/tables'),
                    axios.get('/api/locations')
                ]);
                setTables(tablesRes.data);
                setLocations(locationsRes.data);
                if (locationsRes.data.length > 0 && !selectedLocationId) {
                    setSelectedLocationId(locationsRes.data[0].id);
                }
            } else if (activeTab === 'personnel') {
                const { data } = await axios.get('/api/users');
                setUsers(data);
            } else if (activeTab === 'orders') {
                const { data } = await axios.get('/api/orders');
                setOrders(data);
            } else if (activeTab === 'products') {
                const [prodData, catData] = await Promise.all([
                    axios.get('/api/products'),
                    axios.get('/api/categories')
                ]);
                setProducts(prodData.data);
                setCategories(catData.data);
                if (catData.data.length > 0) {
                    setNewProduct(prev => ({ ...prev, category_id: catData.data[0].id }));
                }
            } else if (activeTab === 'shifts') {
                const { data } = await axios.get('/api/shifts');
                setShifts(data);
            } else if (activeTab === 'audit') {
                const [logsRes, alertsRes] = await Promise.all([
                    axios.get('/api/audit-logs'),
                    axios.get('/api/alerts')
                ]);
                setAuditLogs(logsRes.data);
                setAlerts(alertsRes.data);
            }
        } catch (error) {
            console.error('Error fetching admin data', error);
        } finally {
            setLoading(false);
        }
    };

    // --- LOGICA DE MESAS ---
    const handleCreateTable = async (e) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        try {
            await axios.post('/api/tables', {
                number: newTableNum,
                location_id: selectedLocationId,
                status: 'libre'
            });
            setNewTableNum('');
            fetchData();
            alert('Mesa creada exitosamente');
        } catch (error) {
            alert('Error al crear mesa (quizás el nombre ya existe)');
        } finally {
            setProcessing(true);
            setProcessing(false);
        }
    };

    const handleDeleteTable = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar esta mesa?')) return;
        try {
            await axios.delete(`/api/tables/${id}`);
            fetchData();
        } catch (error) {
            alert('No se pudo eliminar la mesa, averigua si está ocupada');
        }
    };

    // --- LOGICA DE PERSONAL ---
    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        try {
            await axios.post('/api/users', newUser);
            setNewUser({ name: '', email: '', password: '', role: 'mesero' });
            fetchData();
            alert('Personal registrado exitosamente');
        } catch (error) {
            alert('Error al registrar personal. Revisa que el email sea único y el PIN tenga +4 caracteres.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('¿Dar de baja a este empleado?')) return;
        try {
            await axios.delete(`/api/users/${id}`);
            fetchData();
        } catch (error) {
            alert('Error al dar de baja');
        }
    };

    const handleChangeUserPin = async (user) => {
        const newPin = prompt(`Ingrese el NUEVO PIN para el empleado: ${user.name}\n\nDebe tener 4 caracteres o más:`);

        if (newPin === null) return; // Si el administrador cancela

        if (newPin.trim().length < 4) {
            alert('Error: El PIN debe tener un mínimo de 4 caracteres de largo.');
            return;
        }

        try {
            await axios.put(`/api/users/${user.id}`, {
                password: newPin.trim()
            });
            alert(`✅ PIN Actualizado exitosamente para ${user.name}`);
        } catch (error) {
            console.error(error);
            alert('Hubo un error al intentar cambiar el PIN. Inténtalo de nuevo.');
        }
    };

    // --- LOGICA DE PRODUCTOS ---
    const handleCreateProduct = async (e) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        try {
            await axios.post('/api/products', newProduct);
            setNewProduct({ name: '', price: '', stock: 0, category_id: categories.length > 0 ? categories[0].id : '' });
            fetchData();
            alert('Producto añadido al menú');
        } catch (error) {
            alert('Error al agregar el producto');
        } finally {
            setProcessing(false);
        }
    };

    const handleEditClick = (product) => {
        setEditingProduct({ ...product });
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        try {
            await axios.put(`/api/products/${editingProduct.id}`, editingProduct);
            setEditingProduct(null);
            fetchData();
            alert('Producto actualizado correctamente');
        } catch (error) {
            alert('Error al actualizar el producto');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!confirm('¿Eliminar este producto del menú?')) return;
        try {
            await axios.delete(`/api/products/${id}`);
            fetchData();
        } catch (error) {
            alert('No se puede eliminar porque ya está asignado a pedidos existentes.');
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        try {
            await axios.post('/api/categories', { name: newCategoryName });
            setNewCategoryName('');
            fetchData();
            alert('Categoría creada exitosamente');
        } catch (error) {
            alert('Error al crear categoría. Verifica los datos o tu conexión.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!confirm('¿Eliminar esta categoría?')) return;
        try {
            await axios.delete(`/api/categories/${id}`);
            fetchData();
        } catch (error) {
            alert('No se puede eliminar la categoría porque ya tiene productos asignados.');
        }
    };

    const handleCreateLocation = async (e) => {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);
        try {
            await axios.post('/api/locations', { name: newLocationName });
            setNewLocationName('');
            fetchData();
            alert('Área/Lugar creado exitosamente');
        } catch (error) {
            alert('Error al crear el lugar. Quizás ya existe.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteLocation = async (id) => {
        if (!confirm('¿Eliminar esta ubicación? Las mesas asociadas podrían quedar huérfanas o dar error.')) return;
        try {
            await axios.delete(`/api/locations/${id}`);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al eliminar ubicación');
        }
    };

    const handleViewShiftSummary = async (shiftId) => {
        try {
            const { data } = await axios.get(`/api/shifts/${shiftId}/summary`);
            setSelectedShiftSummary(data);
            setShowShiftReportModal(true);
        } catch (error) {
            alert('No se pudo cargar el resumen de la jornada');
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">Panel de Administración</h1>
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-slate-500 font-medium">Gestiona tu restaurante en tiempo real</p>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            🇪🇨 {currentTime.toLocaleString('es-EC', {
                                timeZone: 'America/Guayaquil',
                                weekday: 'short', day: '2-digit', month: 'short',
                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link to="/" className="text-sm font-semibold text-purple-600 hover:text-purple-800 px-4 py-2 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                        &larr; Volver al Menú
                    </Link>
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="text-sm font-semibold text-rose-600 hover:text-rose-800 px-4 py-2 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors"
                        >
                            Cerrar Turno
                        </button>
                    )}
                </div>
            </header>

            {/* Sub-Navegación TABS */}
            <div className="mb-8 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === 'orders' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:text-slate-800'}`}>Historial de Órdenes</button>
                <button onClick={() => setActiveTab('products')} className={`px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === 'products' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:text-slate-800'}`}>Catálogo y Menú</button>
                <button onClick={() => setActiveTab('tables')} className={`px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === 'tables' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:text-slate-800'}`}>Gestión de Mesas</button>
                <button onClick={() => setActiveTab('personnel')} className={`px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === 'personnel' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:text-slate-800'}`}>Personal y Roles</button>
                <button onClick={() => setActiveTab('shifts')} className={`px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === 'shifts' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:text-slate-800'}`}>Registro de Jornadas</button>
                <button onClick={() => setActiveTab('audit')} className={`relative px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === 'audit' ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50/50' : 'text-slate-500 hover:text-slate-800'}`}>
                    Auditoría
                    {alerts.count > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">{alerts.count}</span>
                    )}
                </button>
            </div>

            {/* TAB: MESAS */}
            {activeTab === 'tables' && (
                <div className="flex-1 flex flex-col gap-6">
                    {/* Sección Superior: Formularios */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 border-t-4 border-t-purple-500">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Ingresar Nueva Mesa</h3>
                            <form onSubmit={handleCreateTable} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Número de Mesa</label>
                                    <input type="number" required min="1" className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newTableNum} onChange={(e) => setNewTableNum(e.target.value)} disabled={processing} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Lugar / Área <span className="text-xs font-normal text-slate-400">(Selecciona donde está)</span></label>
                                    <select required className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} disabled={processing || locations.length === 0}>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                    {locations.length === 0 && <p className="text-[10px] text-rose-500 mt-1 font-bold">⚠️ Debes crear un lugar primero al lado.</p>}
                                </div>
                                <button type="submit" disabled={processing || locations.length === 0} className={`w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 ${processing || locations.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {processing ? 'Procesando...' : 'Añadir Mesa'}
                                </button>
                            </form>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 border-t-4 border-t-blue-500 flex flex-col gap-4">
                            <h3 className="text-lg font-bold text-slate-800">Gestión de Áreas / Lugares</h3>
                            <p className="text-xs text-slate-500 font-medium italic">Define las zonas del local (ej: Terraza, VIP, Piso 1)</p>
                            <form onSubmit={handleCreateLocation} className="flex gap-2">
                                <input type="text" required placeholder="Nombre del área" className="flex-1 border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} disabled={processing} />
                                <button type="submit" disabled={processing} className="bg-blue-600 text-white font-bold px-4 rounded-lg hover:bg-blue-700 transition-colors">
                                    {processing ? '...' : 'Añadir'}
                                </button>
                            </form>

                            <div className="mt-2 border-t border-slate-100 pt-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Ubicaciones Registradas</h4>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                                    {locations.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No hay áreas configuradas.</p>
                                    ) : (
                                        locations.map(loc => (
                                            <div key={loc.id} className="bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm">
                                                {loc.name}
                                                <button onClick={() => handleDeleteLocation(loc.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sección Inferior: Plano de Mesas Full Width */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 border-t-4 border-t-emerald-500 flex flex-col h-full min-h-[500px]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Plano General de Mesas</h3>
                                <p className="text-sm text-slate-400 font-medium">Total: <span className="text-emerald-500 font-bold">{tables.length} mesas</span> configuradas en el sistema</p>
                            </div>
                            <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Libres</div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Ocupadas</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                            {tables.map(table => (
                                <div key={table.id} className="relative group">
                                    <div className={`aspect-square rounded-3xl border-2 p-4 flex flex-col items-center justify-center transition-all duration-300 shadow-sm transform hover:-translate-y-1 hover:shadow-xl
                                        ${table.status === 'libre' ? 'bg-white border-slate-100 hover:border-emerald-200' : 'bg-rose-50 border-rose-100 shadow-rose-100/30'}`}>
                                        <span className="text-2xl mb-1">{table.status === 'libre' ? '🪑' : '🍽️'}</span>
                                        <span className="font-bold text-center text-xs text-slate-400 uppercase tracking-tighter mb-1">
                                            {table.location?.name || 'Mesa'}
                                        </span>
                                        <span className="text-2xl font-black text-slate-800 leading-none">
                                            #{table.number}
                                        </span>
                                        <div className={`mt-2 text-[8px] font-black uppercase py-0.5 px-2 rounded-full border shadow-sm ${table.status === 'libre' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                            {table.status}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteTable(table.id)} className="absolute -top-2 -right-2 bg-rose-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10 hover:scale-110 active:scale-90 border-2 border-white">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            ))}
                            {tables.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold uppercase tracking-widest">No hay mesas configuradas aún.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: PERSONAL */}
            {activeTab === 'personnel' && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-1 border-t-4 border-t-purple-500">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Registrar Empleado</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                <input type="text" required className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-xs font-normal text-slate-400">(Debe ser único)</span></label>
                                <input type="email" required className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                                <select className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option value="mesero">Mesero</option>
                                    <option value="cocinero">Cocinero</option>
                                    <option value="cajero">Cajero</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña / PIN <span className="text-xs font-normal text-slate-400">(Mín. 4)</span></label>
                                <input type="password" required minLength="4" className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} disabled={processing} />
                            </div>
                            <button type="submit" disabled={processing} className={`w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 mt-2 ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {processing ? 'Guardando...' : 'Crear Credenciales'}
                            </button>
                        </form>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2 overflow-x-auto">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Directorio de Personal</h3>
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Correo / Ficha</th>
                                    <th className="px-4 py-3">Rol / Nivel</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-semibold text-slate-800">{user.name}</td>
                                        <td className="px-4 py-3">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold capitalize 
                                                ${user.role === 'mesero' ? 'bg-blue-100 text-blue-700' :
                                                    user.role === 'cocinero' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleChangeUserPin(user)} className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 rounded border border-blue-200 bg-blue-50 mr-2 transition-colors">Cambiar PIN</button>
                                            {user.id !== 1 && (
                                                <button onClick={() => handleDeleteUser(user.id)} className="text-rose-500 hover:text-rose-700 font-medium text-xs px-2 py-1 rounded border border-rose-200 bg-rose-50 transition-colors">Dar de Baja</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: ÓRDENES */}
            {activeTab === 'orders' && (
                <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 border-t-4 border-t-purple-500 overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Registro Histórico de Pedidos</h3>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm text-slate-600 mt-2">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-4 py-3 w-20">No. Orden</th>
                                    <th className="px-4 py-3">Descripción Oficial del Pedido</th>
                                    <th className="px-4 py-3 w-32">Estado</th>
                                    <th className="px-4 py-3 w-24 text-right">Total ($)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-8 text-slate-400 font-medium">No se han registrado órdenes en el sistema aún.</td></tr>
                                ) : (
                                    orders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-bold text-slate-800">#{order.id}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                El <span className="font-bold text-slate-900 capitalize">{order.user?.role || 'mesero'} {order.user?.name || 'Desconocido'}</span> hizo la orden de{' '}
                                                <span className="font-semibold text-purple-700">
                                                    {order.details.map(d => `${d.quantity}x ${d.product?.name || 'Producto'}`).join(', ')}
                                                </span>
                                                {' '}en la <span className="font-bold text-slate-900">Mesa {order.table?.number}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                                                    ${order.status === 'pagado' ? 'bg-emerald-100 text-emerald-700' :
                                                        order.status === 'servido' ? 'bg-blue-100 text-blue-700' :
                                                            order.status === 'en_preparacion' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-slate-100 text-slate-700'}`}>
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-slate-800">
                                                ${parseFloat(order.total).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: PRODUCTOS */}
            {activeTab === 'products' && (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <div className="md:col-span-1 flex flex-col gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 border-t-4 border-t-purple-500">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Añadir Platillo / Bebida</h3>
                            <form onSubmit={handleCreateProduct} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                    <input type="text" required className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                    <select className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newProduct.category_id} onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio Unitario ($)</label>
                                    <input type="number" step="0.01" required min="0.01" className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} disabled={processing} />
                                </div>
                                <button type="submit" disabled={processing} className={`w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 mt-2 ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {processing ? 'Guardando...' : 'Publicar en Menú'}
                                </button>
                            </form>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 border-t-4 border-t-blue-500">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Añadir Categoría</h3>
                            <form onSubmit={handleCreateCategory} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Categoría</label>
                                    <input type="text" required className="w-full border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} disabled={processing} />
                                </div>
                                <button type="submit" disabled={processing} className={`w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 mt-2 ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {processing ? '...' : 'Crear Categoría'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 overflow-x-auto">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Inventario Actual</h3>
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Cat.</th>
                                        <th className="px-4 py-3">Precio</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {products.map(product => (
                                        editingProduct && editingProduct.id === product.id ? (
                                            <tr key={product.id} className="bg-purple-50/80">
                                                <td className="px-4 py-3">
                                                    <input type="text" className="w-full text-xs p-1 border border-purple-200 rounded focus:ring-purple-500" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select className="w-full text-xs p-1 border border-purple-200 rounded focus:ring-purple-500" value={editingProduct.category_id} onChange={e => setEditingProduct({ ...editingProduct, category_id: e.target.value })}>
                                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input type="number" step="0.01" className="w-full text-xs p-1 border border-purple-200 rounded focus:ring-purple-500" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })} />
                                                </td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    <button onClick={handleUpdateProduct} disabled={processing} className={`text-emerald-700 hover:text-emerald-900 font-bold text-xs px-2 py-1 rounded border border-emerald-300 bg-emerald-100 shadow-sm focus:ring-2 focus:ring-emerald-500 ${processing ? 'opacity-50' : ''}`}>
                                                        {processing ? '...' : 'Guardar'}
                                                    </button>
                                                    <button onClick={() => setEditingProduct(null)} disabled={processing} className="text-slate-600 hover:text-slate-800 font-medium text-xs px-2 py-1 rounded border border-slate-300 bg-white disabled:opacity-50">Cancelar</button>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-800">{product.name}</td>
                                                <td className="px-4 py-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{product.category?.name}</span></td>
                                                <td className="px-4 py-3 font-black text-slate-700">${parseFloat(product.price).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    <button onClick={() => handleEditClick(product)} className="text-blue-600 hover:text-blue-800 font-bold text-xs px-2 py-1 rounded border border-blue-200 bg-blue-50 transition-colors">Editar</button>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="text-rose-500 hover:text-rose-700 font-bold text-xs px-2 py-1 rounded border border-rose-200 bg-rose-50 transition-colors">Borrar</button>
                                                </td>
                                            </tr>
                                        )
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 overflow-x-auto">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Categorías Existentes</h3>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <div key={cat.id} className="bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm">
                                        {cat.name}
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-rose-500 transition-colors" title="Eliminar Categoría">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: JORNADAS */}
            {activeTab === 'shifts' && (
                <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 border-t-4 border-t-purple-500 overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Auditoría de Aperturas y Cierres</h3>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm text-slate-600 mt-2">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Hora de Inicio</th>
                                    <th className="px-4 py-3">Hora de Finalización</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3 text-right">Reporte</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {shifts.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-8 text-slate-400 font-medium">Aún no se han registrado jornadas laborales.</td></tr>
                                ) : (
                                    shifts.map(shift => (
                                        <tr key={shift.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-bold text-slate-800">
                                                {new Date(shift.start_time).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {new Date(shift.start_time).toLocaleTimeString()}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {shift.end_time ? new Date(shift.end_time).toLocaleTimeString() : '---'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                                                    ${shift.status === 'open' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                                                    {shift.status === 'open' ? 'En Curso (Abierto)' : 'Finalizado'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleViewShiftSummary(shift.id)}
                                                    className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-bold text-xs px-2 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors shadow-sm"
                                                    title="Ver reporte de cierre"
                                                >
                                                    📊 Ver Reporte
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: AUDITORÍA */}
            {activeTab === 'audit' && (
                <div className="space-y-6">

                    {/* PANEL DE ALERTAS */}
                    {alerts.alerts.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-6">
                            <h3 className="text-lg font-bold text-rose-700 mb-4 flex items-center gap-2">
                                ⚠️ Alertas de Inconsistencias ({alerts.count})
                            </h3>
                            <div className="space-y-3">
                                {alerts.alerts.map((alert, i) => (
                                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm font-medium
                                        ${alert.level === 'critical' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                        <span>{alert.level === 'critical' ? '🔴' : '🟡'}</span>
                                        <span>{alert.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {alerts.alerts.length === 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-green-700 font-semibold flex items-center gap-3">
                            ✅ Sin alertas de inconsistencias. El sistema está operando con normalidad.
                        </div>
                    )}

                    {/* TABLA DE LOGS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-lg">Registro de Acciones ({auditLogs.length})</h3>
                            <p className="text-sm text-slate-500">Últimas 200 acciones del sistema</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Fecha / Hora</th>
                                        <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Acción</th>
                                        <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Usuario</th>
                                        <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">Detalles</th>
                                        <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {auditLogs.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-10 text-slate-400">No hay registros de auditoría aún.</td></tr>
                                    ) : (
                                        auditLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                                                    {log.created_at
                                                        ? new Date(log.created_at).toLocaleString('es-EC', {
                                                            timeZone: 'America/Guayaquil',
                                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                        })
                                                        : '---'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase
                                                        ${log.action === 'login_success' ? 'bg-green-100 text-green-700'
                                                            : log.action === 'login_failed' ? 'bg-red-100 text-red-700'
                                                                : log.action === 'login_blocked_no_shift' ? 'bg-orange-100 text-orange-700'
                                                                    : log.action === 'shift_start' ? 'bg-blue-100 text-blue-700'
                                                                        : log.action === 'shift_end' ? 'bg-slate-200 text-slate-700'
                                                                            : log.action === 'order_created' ? 'bg-violet-100 text-violet-700'
                                                                                : log.action === 'order_items_added' ? 'bg-indigo-100 text-indigo-700'
                                                                                    : log.action === 'order_ready' ? 'bg-orange-100 text-orange-700'
                                                                                        : log.action === 'order_delivered' ? 'bg-cyan-100 text-cyan-700'
                                                                                            : log.action === 'order_paid' ? 'bg-emerald-100 text-emerald-700'
                                                                                                : 'bg-amber-100 text-amber-700'}`}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-slate-700">{log.user_name}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                                                    {log.details ? JSON.stringify(log.details) : '---'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{log.ip_address || '---'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE REPORTE DE JORNADA */}
            {showShiftReportModal && selectedShiftSummary && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col p-8 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowShiftReportModal(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>

                        <div className="mb-6">
                            <h2 className="text-3xl font-black text-slate-800 mb-2 flex items-center gap-3">
                                <span className="bg-purple-100 p-2 rounded-xl text-2xl">📉</span>
                                Reporte de Jornada
                            </h2>
                            <p className="text-slate-500 font-medium">
                                Resumen operativo del Día: <span className="text-slate-900 font-bold">{new Date(selectedShiftSummary.shift.start_time).toLocaleDateString()}</span>
                            </p>
                        </div>

                        {/* Indicadores Clave */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                                <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Ventas Totales</span>
                                <span className="text-2xl font-black text-emerald-700">${selectedShiftSummary.total_revenue.toFixed(2)}</span>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
                                <span className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Órdenes Pagadas</span>
                                <span className="text-2xl font-black text-blue-700">{selectedShiftSummary.total_orders}</span>
                            </div>
                            <div className="bg-purple-50 border border-purple-100 p-5 rounded-2xl">
                                <span className="block text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Mesas Atendidas</span>
                                <span className="text-2xl font-black text-purple-700">{selectedShiftSummary.tables_served}</span>
                            </div>
                        </div>

                        {/* Top Productos */}
                        <div className="flex-1 overflow-hidden flex flex-col mb-8">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Productos más vendidos</h3>
                            <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100/50">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-bold text-slate-600">Nombre del Producto</th>
                                            <th className="px-4 py-2 text-center font-bold text-slate-600">Cant.</th>
                                            <th className="px-4 py-2 text-right font-bold text-slate-600">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedShiftSummary.top_products.length === 0 ? (
                                            <tr><td colSpan="3" className="text-center py-6 text-slate-400">No hay ventas registradas en esta jornada.</td></tr>
                                        ) : (
                                            selectedShiftSummary.top_products.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-white transition-colors">
                                                    <td className="px-4 py-2.5 font-semibold text-slate-700">{item.name}</td>
                                                    <td className="px-4 py-2.5 text-center font-bold text-slate-500">{item.quantity}</td>
                                                    <td className="px-4 py-2.5 text-right font-black text-slate-800">${parseFloat(item.revenue).toFixed(2)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowShiftReportModal(false)}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-slate-200"
                        >
                            Cerrar Reporte
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminView;
