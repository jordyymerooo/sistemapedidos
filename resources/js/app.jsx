import './bootstrap';
import '../css/app.css';

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import HomeSelection from './components/HomeSelection';
import KitchenView from './components/KitchenView';
import AdminView from './components/AdminView';
import WaiterView from './components/WaiterView';
import RoleLogin from './components/RoleLogin';
import CashierView from './components/CashierView';

import WaiterDashboard from './components/WaiterDashboard';

const AppRouter = () => {
    // Estados de sesión independientes
    const [activeWaiter, setActiveWaiter] = useState(null);
    const [activeCook, setActiveCook] = useState(null);
    const [activeCashier, setActiveCashier] = useState(null);
    const [activeAdmin, setActiveAdmin] = useState(null);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomeSelection />} />

                {/* RUTAS MESERO */}
                <Route path="/mesero" element={
                    !activeWaiter
                        ? <RoleLogin roleName="mesero" roleLabel="Meseros" onLogin={setActiveWaiter} />
                        : <WaiterDashboard activeWaiter={activeWaiter} onLogout={() => setActiveWaiter(null)} />
                } />
                <Route path="/mesero/pedido/:tableId" element={
                    !activeWaiter
                        ? <RoleLogin roleName="mesero" roleLabel="Meseros" onLogin={setActiveWaiter} />
                        : <WaiterView activeWaiter={activeWaiter} onLogout={() => setActiveWaiter(null)} />
                } />

                {/* RUTA COCINA */}
                <Route path="/cocina" element={
                    !activeCook
                        ? <RoleLogin roleName="cocinero" roleLabel="Cocina" onLogin={setActiveCook} />
                        : <KitchenView activeCook={activeCook} onLogout={() => setActiveCook(null)} />
                } />

                {/* RUTA CAJA */}
                <Route path="/caja" element={
                    !activeCashier
                        ? <RoleLogin roleName="cajero" roleLabel="Caja" onLogin={setActiveCashier} />
                        : <CashierView activeCashier={activeCashier} onLogout={() => setActiveCashier(null)} />
                } />

                {/* RUTA ADMIN */}
                <Route path="/admin" element={
                    !activeAdmin
                        ? <RoleLogin roleName="admin" roleLabel="Administración" onLogin={setActiveAdmin} />
                        : <AdminView activeAdmin={activeAdmin} onLogout={() => setActiveAdmin(null)} />
                } />
            </Routes>
        </BrowserRouter>
    );
};

const rootElement = document.getElementById('app');

if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <AppRouter />
        </React.StrictMode>
    );
}
