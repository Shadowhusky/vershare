#!/bin/bash
# Keeps both dev server and cloudflared tunnel alive
DIR="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
  kill $DEV_PID $TUNNEL_PID 2>/dev/null
  exit 0
}
trap cleanup EXIT INT TERM

# Start dev server
cd "$DIR"
npx next dev -p 7749 &
DEV_PID=$!

# Start tunnel
cloudflared --config "$DIR/cloudflared.yml" --no-autoupdate tunnel run &
TUNNEL_PID=$!

# Wait for either to exit, restart if needed
while true; do
  if ! kill -0 $DEV_PID 2>/dev/null; then
    echo "[serve] Dev server died, restarting..."
    cd "$DIR" && npx next dev -p 7749 &
    DEV_PID=$!
  fi
  if ! kill -0 $TUNNEL_PID 2>/dev/null; then
    echo "[serve] Tunnel died, restarting..."
    cloudflared --config "$DIR/cloudflared.yml" --no-autoupdate tunnel run &
    TUNNEL_PID=$!
  fi
  sleep 5
done
