#!/bin/bash

set -e

echo "🧭 Starting Compass Development Servers"
echo "========================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Run verification first
echo "Running environment checks..."
bash scripts/verify-environment.sh
if [ $? -ne 0 ]; then
    echo -e "${RED}Environment verification failed. Please fix errors before starting.${NC}"
    exit 1
fi
echo ""

# Determine frontend port (fallback if 3000 busy)
REQUESTED_FRONTEND_PORT=${FRONTEND_PORT:-3000}
FALLBACK_FRONTEND_PORT=${FRONTEND_FALLBACK_PORT:-3002}
FRONTEND_PORT=$REQUESTED_FRONTEND_PORT

if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    if [ "$REQUESTED_FRONTEND_PORT" != "3000" ]; then
        echo -e "${RED}[dev] Port $FRONTEND_PORT is already in use. Set FRONTEND_PORT to an open port and retry.${NC}"
        exit 1
    fi
    if lsof -Pi :$FALLBACK_FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}[dev] Ports $REQUESTED_FRONTEND_PORT and $FALLBACK_FRONTEND_PORT are both in use. Stop the other process or export FRONTEND_PORT to a free port.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}[dev] Port $REQUESTED_FRONTEND_PORT is already in use. Using $FALLBACK_FRONTEND_PORT for the frontend.${NC}"
    FRONTEND_PORT=$FALLBACK_FRONTEND_PORT
fi

# Trap to kill background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit
}
trap cleanup INT TERM

# Start backend
echo -e "${BLUE}Starting backend server on http://localhost:3001${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to be ready..."
BACKEND_READY=false
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend ready${NC}"
        BACKEND_READY=true
        break
    fi
    if ! ps -p $BACKEND_PID > /dev/null; then
        echo -e "${RED}✗ Backend failed to start. Check backend.log${NC}"
        tail -20 backend.log
        exit 1
    fi
    sleep 1
    echo -n "."
done
echo ""

# Check if backend is ready after timeout
if [ "$BACKEND_READY" = false ]; then
    echo -e "${RED}✗ Backend health check timeout after 30 seconds${NC}"
    echo -e "${RED}Displaying last 20 lines of backend.log:${NC}"
    tail -20 backend.log
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo -e "${BLUE}Starting frontend server on http://localhost:${FRONTEND_PORT}${NC}"
cd frontend
PORT=$FRONTEND_PORT BROWSER=none npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo -e "${GREEN}✓ Compass is starting!${NC}"
echo ""
echo "  Frontend: http://localhost:${FRONTEND_PORT}"
echo "  Backend:  http://localhost:3001"
echo ""
echo "Logs:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "========================================"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
