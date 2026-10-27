@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0runtime\node.exe" goto missing_node
if not exist "%~dp0frontend\dist\index.html" goto missing_build
if /i "%~1"=="--check" goto check
echo IIDXLab - static frontend
echo Open http://127.0.0.1:4173 in your browser.
echo Close this window or press Ctrl+C to stop the server.
"%~dp0runtime\node.exe" "%~dp0frontend\preview.cjs"
if errorlevel 1 pause
exit /b
:check
"%~dp0runtime\node.exe" --check "%~dp0frontend\preview.cjs"
exit /b %errorlevel%
:missing_node
echo ERROR: runtime\node.exe is missing. Copy the complete IIDXLab folder.
pause
exit /b 1
:missing_build
echo ERROR: frontend\dist\index.html is missing. Build the frontend first.
pause
exit /b 1
