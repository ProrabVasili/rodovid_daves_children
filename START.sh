#!/bin/bash

echo "================================================"
echo "   🌳 РОДОВІД - ШВИДКИЙ ЗАПУСК"
echo "================================================"
echo ""

# Перейти в backend
cd backend

echo "[1/3] 📦 Встановлення залежностей..."
pip install --break-system-packages fastapi uvicorn sentence-transformers fuzzywuzzy python-Levenshtein scikit-learn numpy 2>/dev/null

echo ""
echo "[2/3] 🚀 Запуск Backend (http://localhost:8000)..."
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

sleep 3

cd ../frontend

echo ""
echo "[3/3] 🌐 Запуск Frontend (http://localhost:8080)..."
python -m http.server 8080 &
FRONTEND_PID=$!

echo ""
echo "================================================"
echo "✅ ГОТОВО!"
echo "================================================"
echo ""
echo "🌐 Frontend: http://localhost:8080"
echo "🔧 Backend:  http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "🛑 Для зупинки натисніть Ctrl+C"
echo ""

# Чекаємо
wait $BACKEND_PID $FRONTEND_PID
