@echo off
cd /d "%~dp0"
start "Drone Surveillance Backend" cmd /k ".venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
cd /d "%~dp0frontend"
start "Drone Surveillance Frontend" cmd /k "npm run dev -- --open"
