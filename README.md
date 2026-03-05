# Sistema de Gestión de Pedidos para Restaurantes 🍽️

Un sistema integral y moderno desarrollado con **Laravel (Backend)** y **React + Vite (Frontend)**, diseñado para manejar todo el flujo de trabajo de un restaurante en tiempo real. 

## 🌟 Características Principales

*   **🛡️ Control de Acceso por Roles (RBAC):** Vistas y portales de inicio de sesión separados para Administradores, Cajeros, Cocineros y Meseros, garantizando la seguridad y privacidad de cada área.
*   **📱 Toma de Pedidos Inteligente (Meseros):** Interfaz optimizada para pantallas táctiles. Incluye un buscador de productos en tiempo real, filtros dinámicos por categorías (Bebidas, Platos Fuertes, etc.) y la capacidad de añadir **Notas Especiales** a cada platillo (ej: "Sin cebolla").
*   **👨‍🍳 Pantalla Integrada de Cocina:** Visualización inmediata de las comandas pendientes con alertas visuales (cajas amarillas) para resaltar las notas o instrucciones especiales del cliente en cada platillo.
*   **💰 Caja y Facturación Dinámica:** Capacidad de cobrar mesas completas, liberar espacios al instante, o realizar **Cobros Parciales (Split Check)** cuando grupos de clientes desean pagar por separado.
*   **📊 Dashboard Administrativo:** Panel de control total con 3 apartados:
    1.  **Historial de Órdenes:** Trazabilidad completa de cada ticket, visualizando qué mesero atendió y en qué mesa.
    2.  **Catálogo y Menú:** Gestión de Productos interactiva (CRUD). Añade, edita precios/nombres y elimina platillos o categorías en la misma pantalla sin recargar.
    3.  **Personal y Mesas:** Creación de usuarios (empleados) con asignación de roles y control del plano de mesas.

## 🛠️ Tecnologías Utilizadas

*   **Backend:** PHP 8+, Laravel 11.
*   **Base de Datos:** PostgreSQL.
*   **Frontend:** React 18, Vite, Tailwind CSS (Estilos Modernos).
*   **Peticiones HTTP:** Axios.
*   **Enrutamiento Frontend:** React Router DOM.

## 🚀 Requisitos de Instalación

1.  PHP >= 8.2
2.  Composer
3.  Node.js & npm
4.  PostgreSQL

## ⚙️ Configuración y Despliegue Local

1.  **Clonar el repositorio**
    ```bash
    git clone https://github.com/TU_USUARIO/sistemapedidos.git
    cd sistemapedidos
    ```

2.  **Instalar dependencias de PHP y Node**
    ```bash
    composer install
    npm install
    ```

3.  **Configurar Variables de Entorno**
    Copia el archivo de ejemplo para crear tu `.env`:
    ```bash
    cp .env.example .env
    ```
    Edita el archivo `.env` y configura tu conexión a la base de datos PostgreSQL:
    ```env
    DB_CONNECTION=pgsql
    DB_HOST=127.0.0.1
    DB_PORT=5432
    DB_DATABASE=nombre_de_tu_bd
    DB_USERNAME=tu_usuario
    DB_PASSWORD=tu_contraseña
    ```

4.  **Generar la clave de la aplicación**
    ```bash
    php artisan key:generate
    ```

5.  **Ejecutar Migraciones y Seeders**
    Crea la estructura y los datos iniciales (roles por defecto):
    ```bash
    php artisan migrate:fresh --seed
    ```

6.  **Compilar y Servir**
    Abre dos terminales.
    En la primera, compila los assets del frontend de React:
    ```bash
    npm run build
    # O para desarrollo continuo: npm run dev
    ```
    En la segunda, levanta el servidor de PHP de Laravel:
    ```bash
    php artisan serve
    ```

## 🔐 Usuarios de Prueba (Seeders)

Si ejecutaste los seeders, tendrás acceso a perfiles de prueba en la ruta local (`http://127.0.0.1:8000/`):

*   **Rol:** PIN / Password
*   **admin:** 1234
*   **mesero:** 1234
*   **cocina:** 1234
*   **caja:** 1234
