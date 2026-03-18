import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';

const WaiterView = ({ activeWaiter, onLogout }) => {
    const { tableId } = useParams(); // Extrae la mesa de la URL
    const navigate = useNavigate();

    const [tables, setTables] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    // Mesa bloqueada y seteada por URL
    const [selectedTable, setSelectedTable] = useState(tableId || '');

    const [cart, setCart] = useState([]);
    const [readyOrders, setReadyOrders] = useState([]); // Comandas en barra esperando
    const [loading, setLoading] = useState(true);
    const [shiftActive, setShiftActive] = useState(true); // Bloqueo por jornada
    const [isSubmitting, setIsSubmitting] = useState(false); // Previene doble envío
    const [showCleaningModal, setShowCleaningModal] = useState(false);
    const [showReadyModal, setShowReadyModal] = useState(false); // Modal comandas
    const [currentTime, setCurrentTime] = useState(new Date());

    // Redirigir si alguien entra aquí sin una mesa válida
    useEffect(() => {
        if (!tableId) {
            navigate('/mesero');
        }
    }, [tableId, navigate]);

    // Filtros
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todas');

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 5000); // Polling por si el estado de mesas cambia
        const clockId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            clearInterval(intervalId);
            clearInterval(clockId);
        };
    }, []);

    const fetchData = async () => {
        try {
            const [tablesRes, productsRes, categoriesRes, readyRes, shiftRes] = await Promise.all([
                axios.get('/api/tables'),
                axios.get('/api/products'),
                axios.get('/api/categories'),
                axios.get('/api/orders/ready'),
                axios.get('/api/shifts/current')
            ]);
            setTables(tablesRes.data);
            if (products.length === 0) setProducts(productsRes.data);
            if (categories.length === 0) setCategories(categoriesRes.data);
            setShiftActive(!!shiftRes.data);

            // Ocultar órdenes ya marcadas como leídas localmente
            const dismissed = JSON.parse(localStorage.getItem('dismissedOrders') || '[]');
            setReadyOrders(readyRes.data.filter(o => !dismissed.includes(o.id)));

            setLoading(false);
        } catch (error) {
            console.error("Error fetching data", error);
            setLoading(false);
        }
    };

    const handleDismissOrder = (orderId) => {
        const dismissed = JSON.parse(localStorage.getItem('dismissedOrders') || '[]');
        if (!dismissed.includes(orderId)) {
            dismissed.push(orderId);
            localStorage.setItem('dismissedOrders', JSON.stringify(dismissed));
        }
        setReadyOrders(prev => prev.filter(o => o.id !== orderId));

        // Ocultar modal si ya no quedan notificaciones
        if (readyOrders.length <= 1 && dirtyTables.length === 0) {
            setShowCleaningModal(false);
        }
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.product_id === product.id);
        if (existing) {
            setCart(cart.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { product_id: product.id, name: product.name, price: product.price, quantity: 1, notes: '' }]);
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const updateQuantity = (productId, delta) => {
        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const newQuantity = item.quantity + delta;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
            }
            return item;
        }));
    };

    const updateNotes = (productId, notesText) => {
        setCart(cart.map(item =>
            item.product_id === productId ? { ...item, notes: notesText } : item
        ));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'Todas' || (product.category && product.category.name === selectedCategory);
        return matchesSearch && matchesCategory;
    });

    const submitOrder = async () => {
        if (!selectedTable || cart.length === 0 || isSubmitting) {
            alert("Debe seleccionar una mesa y tener productos en el carrito.");
            return;
        }

        setIsSubmitting(true);

        try {
            await axios.post('/api/orders', {
                table_id: selectedTable,
                user_id: activeWaiter?.id,
                items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity, notes: item.notes }))
            });
            alert("¡Pedido enviado a cocina!");
            setCart([]);
            navigate('/mesero'); // Volvemos al Dashboard Automáticamente
        } catch (error) {
            console.error("Error submitting order", error);
            alert("Ocurrió un error al enviar el pedido.");
            setIsSubmitting(false); // Solo destrabar si falla. Si sale bien, el navigate destruye el componente.
        }
    };

    const handleCleanTable = async (tableId) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/tables/${tableId}`, { needs_cleaning: false });
            await fetchData(); // Refresca para quitar de la lista sucia
            // Si era la última por limpiar, cerramos modal solitos
            const remainingDirty = dirtyTables.filter(t => t.id !== tableId);
            if (remainingDirty.length === 0) setShowCleaningModal(false);
        } catch (error) {
            console.error("Error marcando la mesa como limpia", error);
            alert("No se pudo marcar la mesa como limpia");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeliverOrder = async (orderId) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/orders/${orderId}/deliver`);
            await fetchData();
            const remainingReady = readyOrders.filter(o => o.id !== orderId);
            if (remainingReady.length === 0) setShowReadyModal(false);
        } catch (error) {
            console.error("Error despachando orden a la mesa", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const dirtyTables = tables.filter(t => t.needs_cleaning);

    if (loading && products.length === 0) {
        return <div className="flex h-screen items-center justify-center font-bold text-slate-400">Cargando Menú...</div>;
    }

    if (!shiftActive) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white/10 backdrop-blur-xl p-10 rounded-[3rem] border border-white/20 shadow-2xl max-w-sm">
                    <div className="text-6xl mb-6">🔒</div>
                    <h2 className="text-3xl font-black text-white mb-4">SISTEMA CERRADO</h2>
                    <p className="text-slate-300 font-medium mb-8">
                        La jornada laboral no ha iniciado. No puedes tomar pedidos hasta que Caja abra el día.
                    </p>
                    <div className="inline-flex items-center gap-2 text-amber-400 font-bold bg-amber-400/10 px-4 py-2 rounded-full border border-amber-400/20">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                        Esperando apertura...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative pb-32 md:pb-0">
            {/* Panel Principal (Menú) */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto w-full md:w-2/3">
                <header className="mb-6 flex flex-col space-y-4 md:space-y-0 md:flex-row items-start md:items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800">
                            {(() => {
                                const tbl = tables.find(t => t.id == selectedTable);
                                return tbl && tbl.location ? tbl.location.name : `Mesa ${tbl?.number || selectedTable}`;
                            })()}
                        </h1>
                        <p className="text-sm text-slate-500 font-medium tracking-tight">
                            Atendiendo: <span className="text-blue-600 font-bold ml-1">{activeWaiter?.name || 'Mesero'}</span>
                            <span className="ml-1 text-slate-400"> (Mesa {tables.find(t => t.id == selectedTable)?.number})</span>
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

                        <Link to="/mesero" className="flex-1 md:flex-none text-center text-sm font-semibold text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                            &larr; Mapa de Mesas
                        </Link>
                        {onLogout && (
                            <button onClick={onLogout} className="flex-1 md:flex-none text-sm font-semibold text-rose-600 hover:text-rose-800 px-4 py-2 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors">
                                Cerrar Turno
                            </button>
                        )}
                    </div>
                </header>

                {/* MODAL CAMPANITA (UNIFICADO) */}
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
                                Alertas y novedades en el local.
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
                                                        <span className="font-bold text-blue-900 leading-tight">
                                                            {order.table?.location?.name || 'Área'}
                                                            {order.table?.name && <span className="text-xs font-normal"> ({order.table.name})</span>}
                                                            <span className="block text-sm">Mesa {order.table?.number}</span>
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest">Lista en barra</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDismissOrder(order.id)}
                                                    disabled={isSubmitting}
                                                    className={`px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-lg shadow shadow-blue-200 transition-all whitespace-nowrap ${isSubmitting ? 'opacity-50' : ''}`}
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
                                                        <span className="font-bold text-amber-900 leading-tight">
                                                            {table.location?.name || 'Área'}
                                                            {table.name && <span className="text-xs font-normal"> ({table.name})</span>}
                                                            <span className="block text-sm">Mesa {table.number}</span>
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Sucia</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCleanTable(table.id)}
                                                        disabled={isSubmitting}
                                                        className={`px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow shadow-amber-200 transition-all ${isSubmitting ? 'opacity-50' : ''}`}
                                                    >
                                                        {isSubmitting ? '...' : 'Ya Limpié ✓'}
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



                {/* Filtros de Requerimientos (Buscador y Categorías) */}
                <div className="mb-6 space-y-4">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar en el menú..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-shadow text-slate-700 font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory('Todas')}
                            className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                            ${selectedCategory === 'Todas' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            Todas
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                ${selectedCategory === cat.name ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {filteredProducts.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-400 font-medium">No se encontraron productos con estos filtros.</div>
                    ) : (
                        filteredProducts.map(product => (
                            <div key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between h-full">
                                <h3 className="font-bold text-sm md:text-base text-slate-700 group-hover:text-blue-700 transition-colors line-clamp-2 leading-tight">{product.name}</h3>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-blue-600 font-extrabold text-base md:text-lg">${parseFloat(product.price).toFixed(2)}</span>
                                    <span className="text-[10px] md:text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{product.category?.name || 'Varios'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Panel Lateral / Inferior (Carrito y Mesa) */}
            <div className="fixed md:sticky bottom-0 left-0 right-0 md:top-0 w-full md:w-1/3 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-4 md:p-6 flex flex-col max-h-[60vh] md:max-h-screen md:h-screen shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-none z-50 rounded-t-2xl md:rounded-none">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center">
                        Mesa {tables.find(t => t.id == selectedTable)?.number}
                        <span className="md:hidden bg-blue-100 text-blue-700 text-xs py-0.5 px-2 rounded-full ml-2">{cart.length} ítems</span>
                    </h2>
                </div>

                <div className="hidden md:block mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <label className="block text-xs uppercase tracking-wide font-black text-blue-500 mb-1">Mesa Seleccionada</label>
                    <div className="text-xl font-black text-slate-700">Mesa {tables.find(t => t.id == selectedTable)?.number}</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">Estatus actual: <span className="uppercase text-slate-600 font-bold">{tables.find(t => t.id == selectedTable)?.status}</span></div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl p-2 md:p-4 border border-slate-100 mb-4 md:mb-6 space-y-2 md:space-y-3">
                    {cart.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs md:text-sm font-medium mt-4 md:mt-10">El carrito está vacío</p>
                    ) : (
                        cart.map(item => (
                            <div key={item.product_id} className="flex flex-col bg-white p-2 md:p-3 rounded-lg shadow-sm border border-slate-50">
                                <div className="flex justify-between items-center mb-1.5 md:mb-2">
                                    <div className="flex-1 pr-2">
                                        <h4 className="font-semibold text-slate-700 text-xs md:text-sm leading-tight text-wrap">{item.name}</h4>
                                        <p className="text-blue-600 font-bold text-xs md:text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 md:gap-2">
                                        <button onClick={() => updateQuantity(item.product_id, -1)} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm">-</button>
                                        <span className="font-bold w-3 md:w-4 text-center text-slate-800 text-xs md:text-base">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product_id, 1)} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm">+</button>

                                        {/* Botón Eliminar Ítem completo */}
                                        <button
                                            onClick={() => removeFromCart(item.product_id)}
                                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 ml-0.5 md:ml-1 transition-colors"
                                            title="Eliminar del pedido"
                                        >
                                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Nota: Sin cebolla..."
                                    className="w-full text-[10px] md:text-xs p-1 md:p-1 border border-slate-200 rounded text-slate-600 focus:border-blue-400 focus:ring-0"
                                    value={item.notes || ''}
                                    onChange={(e) => updateNotes(item.product_id, e.target.value)}
                                />
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-auto border-t border-slate-200 pt-3 md:pt-4">
                    <div className="flex justify-between items-center mb-3 md:mb-4 px-1">
                        <span className="text-slate-500 font-bold text-sm md:text-lg">Total Pedido</span>
                        <span className="text-xl md:text-3xl font-black text-slate-800">${cartTotal.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={submitOrder}
                        disabled={cart.length === 0 || !selectedTable || isSubmitting}
                        className={`w-full text-white font-bold py-3 md:py-4 rounded-xl shadow-lg transition-all text-sm md:text-base 
                                   ${isSubmitting ? 'bg-slate-400 cursor-wait shadow-none' : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed'}`}>
                        {isSubmitting ? 'Enviando...' : 'Enviar a Cocina'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WaiterView;
