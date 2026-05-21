#!/bin/bash
# NFL Matchup Lab — start everything with one command
# Run from the capstonefootball directory: ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/nfl-prediction"
FRONTEND_DIR="$SCRIPT_DIR/nfl-frontend"

echo ""
echo "🏈  NFL Matchup Lab"
echo "──────────────────────────────────────"

# ── Backend ──────────────────────────────
echo "▶  Starting backend (FastAPI)..."

if [ ! -d "$BACKEND_DIR/.venv" ]; then
  echo "❌  No .venv found in nfl-prediction. Run: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

cd "$BACKEND_DIR"
source .venv/bin/activate
python3 -m uvicorn src.api:app --reload --port 8000 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID  →  http://127.0.0.1:8000"

# ── Frontend ─────────────────────────────
echo "▶  Starting frontend (Vite / React)..."

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "   node_modules not found — running npm install..."
  cd "$FRONTEND_DIR" && npm install
fi

cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID  →  http://localhost:5173"

echo ""
echo "✅  Both servers running."
echo "   Press Ctrl+C to stop everything."
echo "──────────────────────────────────────"

# ── Cleanup on Ctrl+C ────────────────────
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Keep the script alive
wait
