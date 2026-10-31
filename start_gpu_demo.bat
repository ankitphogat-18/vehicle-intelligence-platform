@echo off
title Vehicle Intelligence Platform - GPU Demo Runner
echo =======================================================================
echo    Vehicle Intelligence Platform - GPU Hackathon Demo Setup
echo =======================================================================
echo.
echo [1/4] Launching Python AI Vision Server on your GPU (Port 8001)...
start "Python GPU Vision Engine (Port 8001)" cmd /k "cd backend && py server.py"

timeout /t 3 >nul

echo [2/4] Launching Node.js Platform Backend (Port 5000)...
start "Node.js Platform Backend (Port 5000)" cmd /k "cd backend && node server.js"

timeout /t 3 >nul

echo [3/4] Launching Local Frontend (http://localhost:5173)...
start "Frontend Dev Server (Port 5173)" cmd /k "cd frontend && npm run dev"

timeout /t 3 >nul

echo [4/4] Exposing Local Backend via HTTPS Tunnel...
echo =======================================================================
echo Copy the URL shown below (e.g. https://xxxx.loca.lt)
echo * For Cloudflare Pages: Click the 'API: Operational' pill in the top bar
echo   or click 'Change Backend URL' on the error box to paste this URL.
echo * For Localhost: Open http://localhost:5173 (Runs 100%% on your laptop GPU)
echo =======================================================================
echo.
npx localtunnel --port 5000
