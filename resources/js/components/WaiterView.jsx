import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const WaiterView = ({ activeWaiter, onLogout }) => {
    const [tables, setTables] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todas');

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 10000); // Polling por si el estado de mesas cambia
        return () => clearInterval(intervalId);
    }, []);

    const fetchData = async () => {
        try {
            const [tablesRes, productsRes, categoriesRes] = await Promise.all([
                axios.get('/api/tables'),
                axios.get('/api/products'),
                axios.get('/api/categories')
            ]);
            setTables(tablesRes.data);
            if (products.length === 0) setProducts(productsRes.data);
            if (categories.length === 0) setCategories(categoriesRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data", error);
            setLoading(false);
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
        if (!selectedTable || cart.length === 0) {
            alert("Debe seleccionar una mesa y tener productos en el carrito.");
            return;
        }

        try {
            await axios.post('/api/orders', {
                table_id: selectedTable,
                user_id: activeWaiter?.id,
                items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity, notes: item.notes }))
            });
            alert("¡Pedido enviado a cocina!");
            setCart([]);
            setSelectedTable('');
            fetchData(); // Refrescar mesas
        } catch (error) {
            console.error("Error submitting order", error);
            alert("Ocurrió un error al enviar el pedido.");
        }
    };

    if (loading && products.length === 0) {
        return <div className="flex h-screen items-center justify-center font-bold text-slate-400">Cargando Menú...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Panel Principal (Menú) */}
            <div className="flex-1 p-6 overflow-y-auto w-full md:w-2/3">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Toma de Pedidos</h1>
                        <p className="text-sm text-slate-500 font-medium tracking-tight">
                            Atendiendo: <span className="text-blue-600 font-bold ml-1">{activeWaiter?.name || 'Mesero'}</span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                            &larr; Volver
                        </Link>
                        {onLogout && (
                            <button onClick={onLogout} className="text-sm font-semibold text-rose-600 hover:text-rose-800 px-4 py-2 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors">
                                Cerrar Turno
                            </button>
                        )}
                    </div>
                </header>

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

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-400 font-medium">No se encontraron productos con estos filtros.</div>
                    ) : (
                        filteredProducts.map(product => (
                            <div key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group">
                                <h3 className="font-bold text-slate-700 group-hover:text-blue-700 transition-colors">{product.name}</h3>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-blue-600 font-extrabold">${parseFloat(product.price).toFixed(2)}</span>
                                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{product.category?.name || 'Varios'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Panel Lateral (Carrito y Mesa) */}
            <div className="w-full md:w-1/3 bg-white border-l border-slate-200 p-6 flex flex-col h-screen sticky top-0">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Detalle del Pedido</h2>

                <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-600 mb-2">Mesa Asignada</label>
                    <select
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                    >
                        <option value="">-- Seleccionar Mesa --</option>
                        {tables.map(table => (
                            <option key={table.id} value={table.id} className={table.status === 'ocupada' ? 'text-amber-600 font-semibold' : ''}>
                                Mesa {table.number} {table.status === 'ocupada' ? '(Activa - Añadir)' : '(Libre)'}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 space-y-3">
                    {cart.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm font-medium mt-10">El carrito está vacío</p>
                    ) : (
                        cart.map(item => (
                            <div key={item.product_id} className="flex flex-col bg-white p-3 rounded-lg shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-700 text-sm truncate">{item.name}</h4>
                                        <p className="text-blue-600 font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => updateQuantity(item.product_id, -1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">-</button>
                                        <span className="font-bold w-4 text-center text-slate-800">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product_id, 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">+</button>

                                        {/* Botón Eliminar Ítem completo */}
                                        <button
                                            onClick={() => removeFromCart(item.product_id)}
                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 ml-1 transition-colors"
                                            title="Eliminar del pedido"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Nota a cocina (ej: Sin cebolla)"
                                    className="w-full text-xs p-1 border border-slate-200 rounded text-slate-600 focus:border-blue-400 focus:ring-0"
                                    value={item.notes || ''}
                                    onChange={(e) => updateNotes(item.product_id, e.target.value)}
                                />
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-auto border-t border-slate-200 pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-500 font-bold text-lg">Total</span>
                        <span className="text-3xl font-black text-slate-800">${cartTotal.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={submitOrder}
                        disabled={cart.length === 0 || !selectedTable}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        Enviar a Cocina
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WaiterView;
