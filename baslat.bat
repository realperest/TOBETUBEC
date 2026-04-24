@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 > nul
title TobeTube Baslatici

echo.
echo ======================================
echo         TobeTube Baslatici
echo ======================================
echo.

echo [1/6] Calisma klasoru kontrolu...
if not exist "server.js" (
  echo HATA: Bu dosyayi proje kokunden calistirin.
  echo Beklenen dosya: server.js
  pause
  exit /b 1
)

echo [2/6] Port 3000 temizleniyor...
for /f "tokens=5" %%P in ('netstat -aon ^| findstr /R /C:":3000 .*LISTENING"') do (
  taskkill /F /PID %%P > nul 2>&1
)
timeout /t 1 /nobreak > nul

echo [3/6] Bagimlilik kontrolu...
if not exist "node_modules" (
  echo node_modules bulunamadi, npm install calisiyor...
  call npm install
  if errorlevel 1 (
    echo HATA: npm install basarisiz.
    pause
    exit /b 1
  )
) else (
  echo node_modules mevcut.
)

echo [4/6] .env kontrolu...
if not exist ".env" (
  echo HATA: .env dosyasi bulunamadi.
  echo Lutfen .env.example dosyasini kopyalayip .env olusturun.
  echo Gerekli degiskenler:
  echo   GOOGLE_CLIENT_ID
  echo   GOOGLE_CLIENT_SECRET
  echo   GOOGLE_REDIRECT_URI
  echo   SESSION_SECRET
  pause
  exit /b 1
)

echo [5/6] Sunucu baslatiliyor...
echo Adres: http://localhost:3000
echo Cikis: Ctrl+C
echo.

start "" cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:3000"
node server.js

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo [Bilgi] Sunucu kapandi. Cikis kodu: %EXIT_CODE%
echo [Bilgi] Bu pencere acik kalacak. Kapatmak icin bir tusa basin.
pause > nul
exit /b %EXIT_CODE%
