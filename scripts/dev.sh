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

# Trap to kill background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
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
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend ready${NC}"
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

# Start frontend
echo -e "${BLUE}Starting frontend server on http://localhost:3000${NC}"
cd frontend
BROWSER=none npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo -e "${GREEN}✓ Compass is starting!${NC}"
echo ""
echo "  Frontend: http://localhost:3000"
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
