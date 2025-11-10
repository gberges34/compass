#!/bin/bash

echo "🧭 Compass Health Check"
echo "======================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check backend
echo -n "Backend (http://localhost:3001): "
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null)
if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}Running ✓${NC}"
    BACKEND_UP=1
else
    echo -e "${RED}Down ✗${NC}"
    BACKEND_UP=0
fi

# Check frontend
echo -n "Frontend (http://localhost:3000): "
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}Running ✓${NC}"
    FRONTEND_UP=1
else
    echo -e "${RED}Down ✗${NC}"
    FRONTEND_UP=0
fi

# Check database
echo -n "Database connection: "
cd backend 2>/dev/null
if [ -f "node_modules/.bin/prisma" ]; then
    DB_CHECK=$(npx prisma db execute --stdin <<< "SELECT 1;" 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Connected ✓${NC}"
        DB_UP=1
    else
        echo -e "${RED}Failed ✗${NC}"
        DB_UP=0
    fi
else
    echo -e "${YELLOW}Cannot check (Prisma not installed) ⚠${NC}"
    DB_UP=-1
fi
cd .. 2>/dev/null

echo ""
echo "======================="

# Summary
if [ $BACKEND_UP -eq 1 ] && [ $FRONTEND_UP -eq 1 ] && [ $DB_UP -eq 1 ]; then
    echo -e "${GREEN}✓ All systems operational${NC}"
    exit 0
elif [ $BACKEND_UP -eq 0 ] && [ $FRONTEND_UP -eq 0 ]; then
    echo -e "${YELLOW}⚠ Servers not running. Start with: npm run dev${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠ Some services are down${NC}"
    exit 1
fi
