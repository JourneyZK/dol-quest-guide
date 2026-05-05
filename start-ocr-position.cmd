@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Stopping old OCR window...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$current=$PID; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'live-position-ocr\.ps1' -and $_.ProcessId -ne $current } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo.
echo Choose OCR region:
echo   1. Drag a new coordinate area
echo   2. Reuse the saved area
echo.
choice /C 12 /N /M "Press 1 or 2: "
if errorlevel 2 (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\live-position-ocr.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\live-position-ocr.ps1" -ResetRegion
)
echo.
echo OCR stopped. You can close this window.
pause >nul
