#!/bin/bash

echo "🧭 Compass Health Check"
echo "======================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MODE=${1:-""}

# Check backend
echo -n "Backend (http://localhost:3001): "
BACKEND_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/health 2>/dev/null)
BACKEND_HTTP=$(echo "$BACKEND_RESPONSE" | tail -n 1)
BACKEND_BODY=$(echo "$BACKEND_RESPONSE" | sed '$d')

parse_health_field() {
    local body="$1"
    local field="$2"
    node -e "
      try {
        const data = JSON.parse(process.argv[1] || '{}');
        if (process.argv[2] === 'status') {
          console.log(data.status || '');
        } else if (process.argv[2] === 'deps') {
          const deps = Object.entries(data.dependencies || {})
            .filter(([, dep]) => dep && dep.status && dep.status !== 'up')
            .map(([name, dep]) => \`\${name}=\${dep.status}\${dep.error ? ' (' + dep.error + ')' : ''}\`);
          console.log(deps.join(', '));
        }
      } catch {
        console.log('');
      }
    " "$body" "$field" 2>/dev/null
}

BACKEND_STATUS=""
BACKEND_DEPS=""
if [ -n "$BACKEND_BODY" ]; then
    BACKEND_STATUS=$(parse_health_field "$BACKEND_BODY" "status")
    BACKEND_DEPS=$(parse_health_field "$BACKEND_BODY" "deps")
fi

if [ "$BACKEND_HTTP" = "200" ] && [ "$BACKEND_STATUS" = "ok" ]; then
    echo -e "${GREEN}Running ✓${NC}"
    BACKEND_UP=1
elif [ "$BACKEND_HTTP" = "503" ] || [ "$BACKEND_STATUS" = "fail" ]; then
    echo -e "${RED}Degraded ✗${NC}"
    if [ -n "$BACKEND_DEPS" ]; then
        echo "  Dependencies: $BACKEND_DEPS"
    fi
    BACKEND_UP=0
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

ALL_OK=1
if [ $BACKEND_UP -ne 1 ] || [ $FRONTEND_UP -ne 1 ] || [ $DB_UP -ne 1 ]; then
    ALL_OK=0
fi

if [ $BACKEND_UP -eq 1 ] && [ $FRONTEND_UP -eq 1 ] && [ $DB_UP -eq 1 ]; then
    echo -e "${GREEN}✓ All systems operational${NC}"
elif [ $BACKEND_UP -eq 0 ] && [ $FRONTEND_UP -eq 0 ]; then
    echo -e "${YELLOW}⚠ Servers not running. Start with: npm run dev${NC}"
else
    echo -e "${YELLOW}⚠ Some services are down${NC}"
fi

if [ $ALL_OK -eq 1 ]; then
    exit 0
else
    exit 1
fi
