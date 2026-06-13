@echo off
title Bilnet Oyun - Test Server (localhost:8000)
cd /d "%~dp0"

REM Zaten calisiyorsa tekrar baslatma, sadece tarayici ac
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo Server ZATEN calisiyor. Tarayici aciliyor...
  start "" http://localhost:8000
  timeout /t 2 >nul
  exit /b
)

echo Server baslatiliyor: http://localhost:8000
start "BilnetOyun Server - kapatmak icin bu pencereyi kapatin" /min python server.py
timeout /t 2 /nobreak >nul
start "" http://localhost:8000

echo.
echo ============================================================
echo  Server calisiyor:  http://localhost:8000
echo  DURDURMAK icin:    gorev cubugundaki kucuk "BilnetOyun
echo                     Server" penceresini kapatin.
echo ============================================================
timeout /t 4 >nul
