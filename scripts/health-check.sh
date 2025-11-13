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

should_run_anthropic_check() {
    local flag
    flag=$(printf '%s' "${CHECK_ANTHROPIC:-}" | tr '[:upper:]' '[:lower:]')
    if [ "$flag" = "true" ] || [ "$flag" = "1" ] || [ "$flag" = "yes" ]; then
        return 0
    fi
    return 1
}

get_anthropic_key() {
    if [ -n "${COMPASS_ANTHROPIC_API_KEY:-}" ]; then
        printf '%s' "$COMPASS_ANTHROPIC_API_KEY"
    else
        printf '%s' "${ANTHROPIC_API_KEY:-}"
    fi
}

check_anthropic() {
    echo -n "Anthropic connectivity: "

    if ! command -v curl >/dev/null 2>&1; then
        echo -e "${RED}curl not available ✗${NC}"
        return 1
    fi

    local api_key
    api_key=$(get_anthropic_key)

    if [ -z "$api_key" ]; then
        echo -e "${YELLOW}Missing COMPASS_ANTHROPIC_API_KEY / ANTHROPIC_API_KEY ⚠${NC}"
        return 1
    fi

    local payload
    payload=$(cat <<'JSON'
{
  "model": "claude-3-5-sonnet-latest",
  "max_tokens": 1,
  "messages": [
    {
      "role": "user",
      "content": "ping"
    }
  ]
}
JSON
)

    local response
    response=$(curl -s -w "\n%{http_code}" https://api.anthropic.com/v1/messages \
        -H "x-api-key: $api_key" \
        -H "anthropic-version: 2023-06-01" \
        -H "content-type: application/json" \
        -d "$payload" 2>/dev/null)

    local http_status
    http_status=$(echo "$response" | tail -n 1)
    local body
    body=$(echo "$response" | sed '$d')

    if [ "$http_status" = "200" ]; then
        echo -e "${GREEN}Reachable ✓${NC}"
        return 0
    else
        local snippet
        snippet=$(echo "$body" | head -c 160 | tr '\n' ' ')
        echo -e "${RED}Failed (${http_status}) ✗${NC}"
        if [ -n "$snippet" ]; then
            echo "  Details: ${snippet}..."
        fi
        return 1
    fi
}

if [ "$MODE" = "anthropic" ]; then
    if check_anthropic; then
        exit 0
    else
        exit 1
    fi
fi

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

ANTHROPIC_STATUS=-1
ANTHROPIC_REQUESTED=0
if should_run_anthropic_check; then
    ANTHROPIC_REQUESTED=1
    echo ""
    if check_anthropic; then
        ANTHROPIC_STATUS=1
    else
        ANTHROPIC_STATUS=0
    fi
fi

echo ""
echo "======================="

ALL_OK=1
if [ $BACKEND_UP -ne 1 ] || [ $FRONTEND_UP -ne 1 ] || [ $DB_UP -ne 1 ]; then
    ALL_OK=0
fi
if [ $ANTHROPIC_REQUESTED -eq 1 ] && [ $ANTHROPIC_STATUS -ne 1 ]; then
    ALL_OK=0
fi

if [ $BACKEND_UP -eq 1 ] && [ $FRONTEND_UP -eq 1 ] && [ $DB_UP -eq 1 ]; then
    if [ $ANTHROPIC_REQUESTED -eq 1 ] && [ $ANTHROPIC_STATUS -ne 1 ]; then
        echo -e "${YELLOW}⚠ Anthropic connectivity failed${NC}"
    else
        echo -e "${GREEN}✓ All systems operational${NC}"
    fi
elif [ $BACKEND_UP -eq 0 ] && [ $FRONTEND_UP -eq 0 ]; then
    echo -e "${YELLOW}⚠ Servers not running. Start with: npm run dev${NC}"
else
    echo -e "${YELLOW}⚠ Some services are down${NC}"
fi

if [ $ANTHROPIC_REQUESTED -eq 1 ]; then
    if [ $ANTHROPIC_STATUS -eq 1 ]; then
        echo -e "${GREEN}Anthropic connectivity verified ✓${NC}"
    else
        echo -e "${RED}Anthropic connectivity failed ✗${NC}"
    fi
fi

if [ $ALL_OK -eq 1 ]; then
    exit 0
else
    exit 1
fi
