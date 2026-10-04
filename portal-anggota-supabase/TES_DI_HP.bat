@echo off
title Hub Pengujian Mobile - Portal Teater Q
color 0B
cls

echo ==============================================================================
echo           TEATER Q - PENGUJIAN TAMPILAN PORTAL TEATER Q DI HP                   
echo ==============================================================================
echo.
echo  PILIH CARA PENGUJIAN:
echo.
echo  [1] Uji via Wi-Fi Lokal (Paling Cepat - Laptop dan HP di 1 Wi-Fi / Hotspot)
echo      * Otomatis deteksi IP, tampilkan link HP ^& buka QR Code di browser.
echo.
echo  [2] Uji via Link Online Tunnel (Bisa dibuka di HP dari mana saja via Kuota)
echo      * Membuat tautan HTTPS publik gratis tanpa upload ke Netlify.
echo.
echo  [3] Buka Hub Pengujian Langsung di Browser Laptop
echo.
echo  [4] Keluar
echo.
echo ==============================================================================
set /p pilihan="Masukkan nomor pilihan Anda (1/2/3/4) lalu Enter: "

if "%pilihan%"=="1" goto opt_wifi
if "%pilihan%"=="2" goto opt_tunnel
if "%pilihan%"=="3" goto opt_browser
if "%pilihan%"=="4" goto opt_exit

:opt_wifi
cls
echo [Menjalankan Pengujian via Wi-Fi Lokal...]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve_mobile.ps1" -Mode wifi
goto opt_exit

:opt_tunnel
cls
echo [Menghubungkan ke Online Tunnel...]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve_mobile.ps1" -Mode tunnel
goto opt_exit

:opt_browser
start http://localhost:5500/mobile_hub.html
goto opt_exit

:opt_exit
echo.
echo Terima kasih!
pause
exit
