@echo off
title Store BI Launcher
echo ===================================================
echo             Starting Store BI Servers
echo ===================================================
echo.
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "Store BI - Backend (:8000)" cmd /k "cd backend && .\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "Store BI - Frontend (:5173)" cmd /k "cd frontend && npm.cmd run dev"

echo.
echo ---------------------------------------------------
echo Both servers are running!
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:8000 (Docs: http://localhost:8000/docs)
echo ---------------------------------------------------
