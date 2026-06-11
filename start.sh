#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Backend
echo "[backend] Starting FastAPI..."
cd "$ROOT/backend"
source "$ROOT/.venv/bin/activate"
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
echo "[frontend] Starting Vite..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
