@echo off
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node.js is not installed. Get the LTS version from https://nodejs.org and run this again. & pause & exit /b 1)
echo Downloading build tools (first time only, about 150 MB)...
call npm install --no-audit --no-fund || (pause & exit /b 1)
call npm run build || (pause & exit /b 1)
start "" "%~dp0dist\Hollow lane (Claires version!)-win32-x64"
echo Double-click "Hollow lane (Claires version!).exe" in the folder that just opened.
pause
