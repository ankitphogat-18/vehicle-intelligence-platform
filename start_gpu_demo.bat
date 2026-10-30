@echo off
title Vehicle Intelligence Platform - GPU Demo Runner
echo =======================================================================
echo    Vehicle Intelligence Platform - GPU Hackathon Demo Setup
echo =======================================================================
echo.
echo [1/3] Launching Python AI Vision Server on your GPU (Port 8001)...
start "Python GPU Vision Engine (Port 8001)" cmd /k "cd backend && py server.py"

timeout /t 3 >nul

echo [2/3] Launching Node.js Platform Backend (Port 5000)...
start "Node.js Platform Backend (Port 5000)" cmd /k "cd backend && node server.js"

timeout /t 4 >nul

echo [3/3] Exposing Local Backend via HTTPS Tunnel...
echo =======================================================================
echo Copy the URL shown below (e.g. https://xxxx.loca.lt)
echo You can use it in Cloudflare Pages settings (VITE_API_URL) OR
echo simply visit your site with: https://YOUR-PAGES-URL/?api=https://xxxx.loca.lt
echo =======================================================================
echo.
npx localtunnel --port 5000
