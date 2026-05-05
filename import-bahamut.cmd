@echo off
setlocal EnableExtensions
chcp 65001 > nul
title Bahamut Quest Import
cd /d "%~dp0"

set "NODE_EXE=C:\Users\ThinkPad\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=D:\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

echo ===============================================
echo Bahamut quest import
echo ===============================================
echo.
echo This window should stay open while importing.
echo If it fails, copy the message shown here.
echo.
echo [1] Quick test: first 20 merchant quests
echo [2] Merchant quests from menu
echo [3] Adventure quests from menu
echo [4] Battle quests from menu
echo [5] Job-change quests from menu
echo [6] All task pages from menu, very slow
echo [7] Exit
echo.
choice /C 1234567 /N /M "Choose a mode: "

if errorlevel 7 goto done
if errorlevel 6 goto all
if errorlevel 5 goto transfer
if errorlevel 4 goto battle
if errorlevel 3 goto adventure
if errorlevel 2 goto merchant
if errorlevel 1 goto test

:test
set "ARGS=https://acg.gamer.com.tw/wikimenu.php?s=7501 --include=merchant --details --limit=20 --delay=500 --out=data\bahamut-import-test.json --alias=data\jp-aliases-template.csv"
goto run

:merchant
set "ARGS=https://acg.gamer.com.tw/wikimenu.php?s=7501 --include=merchant --details --delay=700 --out=data\bahamut-import.json --alias=data\jp-aliases-template.csv"
goto run

:adventure
set "ARGS=https://acg.gamer.com.tw/wikimenu.php?s=7501 --include=adventure --details --delay=700 --out=data\bahamut-import.json --alias=data\jp-aliases-template.csv"
goto run

:battle
set "ARGS=https://acg.gamer.com.tw/wikimenu.php?s=7501 --include=battle --details --delay=700 --out=data\bahamut-import.json --alias=data\jp-aliases-template.csv"
goto run

:transfer
set "ARGS=https://acg.gamer.com.tw/wikimenu.php?s=7501 --include=transfer --details --delay=700 --out=data\bahamut-import.json --alias=data\jp-aliases-template.csv"
goto run

:all
set "ARGS=https://acg.gamer.com.tw/wikimenu.php?s=7501 --details --delay=900 --out=data\bahamut-import.json --alias=data\jp-aliases-template.csv"
goto run

:run
echo.
echo Node: %NODE_EXE%
echo.
echo Import started. This may take a while.
echo.
"%NODE_EXE%" tools\import-bahamut.mjs %ARGS%
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if "%EXIT_CODE%"=="0" (
  echo Import finished.
  echo If you chose mode 1, import data\bahamut-import-test.json in index.html.
  echo Otherwise, import data\bahamut-import.json in index.html.
) else (
  echo Import failed with code %EXIT_CODE%.
)
echo.
pause
exit /b %EXIT_CODE%

:done
echo.
echo Closed.
pause
exit /b 0
