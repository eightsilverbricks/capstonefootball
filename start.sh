#!/bin/bash
# The Clark Index — start everything with one command
# Run from the capstonefootball directory: ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/nfl-prediction"
FRONTEND_DIR="$SCRIPT_DIR/primary-ui"

echo ""
echo "🏈  The Clark Index"
echo "──────────────────────────────────────"

# ── Backend ──────────────────────────────
echo "▶  Starting backend (FastAPI)..."

if [ ! -d "$BACKEND_DIR/.venv" ]; then
  echo "❌  No .venv found in nfl-prediction."
  echo "    Run: cd nfl-prediction && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
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
echo "   Frontend PID: $FRONTEND_PID  →  http://localhost:8080"

# ── Wait for Vite to be ready, then open browser ─────────────────────────────
echo ""
echo "   Waiting for Vite..."
for i in $(seq 1 15); do
  if curl -s http://localhost:8080 > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Open the browser (macOS: open, Linux: xdg-open, fallback: skip)
URL="http://localhost:8080"
if command -v open &>/dev/null; then
  open "$URL"
elif command -v xdg-open &>/dev/null; then
  xdg-open "$URL"
fi

echo ""
echo "✅  The Clark Index is running."
echo "   Frontend  →  $URL"
echo "   Backend   →  http://127.0.0.1:8000"
echo ""
echo "   Note: The frontend uses static predictions.json from public/"
echo "   The backend is available for local re-export or live mode."
echo ""
echo "   Press Ctrl+C to stop everything."
echo "──────────────────────────────────────"

# ── Cleanup on Ctrl+C ────────────────────
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
