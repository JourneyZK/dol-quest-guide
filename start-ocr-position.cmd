@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Stopping old OCR window...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$current=$PID; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'live-position-ocr\.ps1' -and $_.ProcessId -ne $current } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo.
echo Choose OCR region:
echo   1. Drag a new coordinate area (manual scan, smoothest)
echo   2. Reuse the saved area (manual scan, smoothest)
echo   3. Reuse the saved area (slow auto scan)
echo   4. Reuse the saved area (high accuracy, may lag)
echo.
choice /C 1234 /N /M "Press 1, 2, 3, or 4: "
if errorlevel 4 (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\live-position-ocr.ps1" -HighAccuracy
) else if errorlevel 3 (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\live-position-ocr.ps1" -IntervalSeconds 8
) else if errorlevel 2 (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\live-position-ocr.ps1" -ManualScan
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\live-position-ocr.ps1" -ResetRegion -ManualScan
)
echo.
echo OCR stopped. You can close this window.
pause >nul
