import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const AdminView = () => {
    const [activeTab, setActiveTab] = useState('tables'); // tables, personnel, orders, products

    // CRUD States
    const [tables, setTables] = useState([]);
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [newTableNum, setNewTableNum] = useState('');
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'mesero' });
    const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: 0, category_id: '' });
    const [editingProduct, setEditingProduct] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'tables') {
                const { data } = await axios.get('/api/tables');
                setTables(data);
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
        try {
            await axios.post('/api/tables', { number: newTableNum, status: 'libre' });
            setNewTableNum('');
            fetchData();
            alert('Mesa creada exitosamente');
        } catch (error) {
            alert('Error al crear mesa (quizás el número ya existe)');
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
        try {
            await axios.post('/api/users', newUser);
            setNewUser({ name: '', email: '', password: '', role: 'mesero' });
            fetchData();
            alert('Personal registrado exitosamente');
        } catch (error) {
            alert('Error al registrar personal. Revisa que el email sea único y el PIN tenga +4 caracteres.');
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

    // --- LOGICA DE PRODUCTOS ---
    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/products', newProduct);
            setNewProduct({ name: '', price: '', stock: 0, category_id: categories.length > 0 ? categories[0].id : '' });
            fetchData();
            alert('Producto añadido al menú');
        } catch (error) {
            alert('Error al agregar el producto');
        }
    };

    const handleEditClick = (product) => {
        setEditingProduct({ ...product });
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/products/${editingProduct.id}`, editingProduct);
            setEditingProduct(null);
            fetchData();
            alert('Producto actualizado correctamente');
        } catch (error) {
            alert('Error al actualizar el producto');
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
        try {
            await axios.post('/api/categories', { name: newCategoryName });
            setNewCategoryName('');
            fetchData();
            alert('Categoría creada exitosamente');
        } catch (error) {
            alert('Error al crear categoría. Verifica los datos o tu conexión.');
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


    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">Panel de Administración</h1>
                    <p className="text-sm text-slate-500 font-medium">Gestiona tu restaurante en tiempo real</p>
                </div>
                <Link to="/" className="text-sm font-semibold text-purple-600 hover:text-purple-800 px-4 py-2 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                    &larr; Volver al Menú
                </Link>
            </header>

            {/* Sub-Navegación TABS */}
            <div className="mb-8 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === 'orders' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:text-slate-800'}`}>Historial de Órdenes</button>
                <button onClick={() => setActiveTab('products')} className={`px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === 'products' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:text-slate-800'}`}>Catálogo y Menú</button>
                <button onClick={() => setActiveTab('tables')} className={`px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === 'tables' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:text-slate-800'}`}>Gestión de Mesas</button>
                <button onClick={() => setActiveTab('personnel')} className={`px-4 py-2 font-bold rounded-t-lg transition-colors ${activeTab === 'personnel' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-slate-500 hover:text-slate-800'}`}>Personal y Roles</button>
            </div>

            {/* TAB: MESAS */}
            {activeTab === 'tables' && (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 md:col-span-1 border-t-4 border-t-purple-500">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Ingresar Nueva Mesa</h3>
                        <form onSubmit={handleCreateTable} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Número de Mesa</label>
                                <input type="number" required min="1" className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newTableNum} onChange={(e) => setNewTableNum(e.target.value)} />
                            </div>
                            <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700">Añadir Mesa</button>
                        </form>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 md:col-span-2">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Plano de Mesas</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {tables.map(table => (
                                <div key={table.id} className="relative bg-slate-50 p-4 border border-slate-200 rounded-xl text-center group">
                                    <button onClick={() => handleDeleteTable(table.id)} className="absolute top-2 right-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                    <span className="block text-2xl font-black text-slate-700 mb-2">Mesa {table.number}</span>
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${table.status === 'ocupada' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {table.status.toUpperCase()}
                                    </span>
                                </div>
                            ))}
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
                                <input type="password" required minLength="4" className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                            </div>
                            <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 mt-2">Crear Credenciales</button>
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
                                            {user.id !== 1 && (
                                                <button onClick={() => handleDeleteUser(user.id)} className="text-rose-500 hover:text-rose-700 font-medium text-xs px-2 py-1 rounded border border-rose-200 bg-rose-50">Dar de Baja</button>
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
                                    <input type="number" step="0.01" required min="0.01" className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} />
                                </div>
                                <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 mt-2">Publicar en Menú</button>
                            </form>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 border-t-4 border-t-blue-500">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Añadir Categoría</h3>
                            <form onSubmit={handleCreateCategory} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Categoría</label>
                                    <input type="text" required className="w-full border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 mt-2">Crear Categoría</button>
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
                                                    <button onClick={handleUpdateProduct} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs px-2 py-1 rounded border border-emerald-300 bg-emerald-100 shadow-sm focus:ring-2 focus:ring-emerald-500">Guardar</button>
                                                    <button onClick={() => setEditingProduct(null)} className="text-slate-600 hover:text-slate-800 font-medium text-xs px-2 py-1 rounded border border-slate-300 bg-white">Cancelar</button>
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
        </div>
    );
};

export default AdminView;
