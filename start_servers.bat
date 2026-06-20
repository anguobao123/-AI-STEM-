@echo off
start "Backend" cmd /c "cd /d G:\Desktop\tuiangfenlei\0620-tuiangfenlei\backend && python app.py"
start "Frontend" cmd /c "cd /d G:\Desktop\tuiangfenlei\0620-tuiangfenlei\frontend && npm run dev -- --host 127.0.0.1 --port 5173"
echo Both servers started in separate windows.
echo Backend:  http://127.0.0.1:5000
echo Frontend: http://127.0.0.1:5173
pause
