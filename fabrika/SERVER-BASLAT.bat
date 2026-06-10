@echo off
rem Fabrika test sunucusu — bu pencere ACIK KALDIGI SURECE oyunlar erisilir.
rem PC'de:      http://localhost:8000/fabrika/build/
rem Telefonda:  http://<PC-IP>:8000/fabrika/build/   (ayni Wi-Fi'de)
cd /d "%~dp0\.."
echo.
echo  Fabrika sunucusu basliyor...  (kapatmak icin bu pencereyi kapat)
echo.
echo  PC'den:
echo     http://localhost:8000/fabrika/build/ates-buz-tr.html
echo.
echo  Telefondan (ayni Wi-Fi):
ipconfig | findstr /i "IPv4"
echo     http://YUKARIDAKI-IP:8000/fabrika/build/ates-buz-tr.html
echo.
python -m http.server 8000
pause
