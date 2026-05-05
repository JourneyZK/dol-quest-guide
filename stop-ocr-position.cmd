@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Stopping OCR window...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$current=$PID; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'live-position-ocr\.ps1' -and $_.ProcessId -ne $current } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
echo Done. If an old window is still visible, close it directly.
pause
