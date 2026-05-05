@echo off
setlocal EnableExtensions
chcp 65001 > nul
title Japanese Quest Import
cd /d "%~dp0"

set "NODE_EXE=C:\Users\ThinkPad\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=D:\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

echo ===============================================
echo Japanese quest import from GVDB
echo ===============================================
echo.
echo Input the Japanese quest name exactly as shown in game.
echo Example: Shounin e no tenshoku
echo You may paste Japanese text in the next line.
echo.
set /p QUEST_NAME=Quest name: 

if "%QUEST_NAME%"=="" (
  echo.
  echo No quest name entered.
  pause
  exit /b 1
)

echo.
echo Searching and importing:
echo %QUEST_NAME%
echo.
"%NODE_EXE%" tools\import-gvdb.mjs --query "%QUEST_NAME%" --out=data\gvdb-import.json --limit=5
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo Import finished.
  echo Open index.html, then import data\gvdb-import.json.
) else (
  echo Import failed with code %EXIT_CODE%.
)
echo.
pause
exit /b %EXIT_CODE%
