@echo off
setlocal EnableExtensions
chcp 65001 > nul
title Quest Guide Web
cd /d "%~dp0"

set "NODE_EXE=C:\Users\ThinkPad\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=D:\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

set "PORT=8765"
set "URL=http://127.0.0.1:%PORT%"

echo ===============================================
echo Quest Guide Web
echo ===============================================
echo.
echo The tool will open in your browser:
echo %URL%
echo.
echo Keep this window open while using the web page.
echo Close this window to stop the local helper.
echo.
start "" "%URL%"
"%NODE_EXE%" server.mjs
echo.
echo Server stopped.
pause
