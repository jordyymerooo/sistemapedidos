@echo off
TITLE Sistema de Pedidos - Restaurante
color 0B

echo ===================================================
echo.
echo   INICIANDO SISTEMA DE PEDIDOS - RESTAURANTE
echo.
echo ===================================================
echo.
echo Iniciando el servidor local del sistema...
echo Por favor, NO CIERRE ESTA VENTANA NEGRA mientras este trabajando.
echo.
echo Obteniendo tu Direccion IP para celulares/tablets...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "ipv4"') do (
    set LOCAL_IP=%%a
)
:: Limpiar espacios en blanco
set LOCAL_IP=%LOCAL_IP: =%

echo ---------------------------------------------------
echo URL PARA CAJA (ESTA PC): http://127.0.0.1:8000
echo URL PARA CELULARES Y MESEROS: http://%LOCAL_IP%:8000
echo ---------------------------------------------------
echo.
echo Abriendo el navegador web...
echo.
:: Esperamos 2 segundos para dar tiempo
timeout /t 2 /nobreak > NUL

:: Abrimos el navegador predeterminado en la URL del sistema (solo en esta PC)
start http://127.0.0.1:8000

:: Iniciamos el motor PHP de Laravel EN MODO RED ABIERTA (0.0.0.0)
php artisan serve --host=0.0.0.0 --port=8000
