@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Clearing OCR learning templates...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\live-position-ocr.ps1" -ClearTemplatesOnly
echo Done. OCR will learn again from scratch next time you press T.
pause
