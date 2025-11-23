@echo off
echo ================================================
echo    РОДОВІД - ШВИДКИЙ ЗАПУСК
echo ================================================
echo.

cd backend

echo [1/3] Встановлення залежностей...
pip install --break-system-packages fastapi uvicorn sentence-transformers fuzzywuzzy python-Levenshtein scikit-learn numpy

echo.
echo [2/3] Запуск Backend (http://localhost:8000)...
start cmd /k "python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 > nul

cd ../frontend

echo.
echo [3/3] Запуск Frontend (http://localhost:8080)...
start cmd /k "python -m http.server 8080"

echo.
echo ================================================
echo ГОТОВО!
echo ================================================
echo.
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
pause
