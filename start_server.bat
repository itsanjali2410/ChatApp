@echo off
echo Starting ChatApp Backend Server...
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
