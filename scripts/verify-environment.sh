#!/bin/bash

echo "🧭 Compass Environment Verification"
echo "===================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Check Node.js
echo -n "Node.js version: "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "${GREEN}$NODE_VERSION ✓${NC}"
    else
        echo -e "${RED}$NODE_VERSION (requires 18+) ✗${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}Not installed ✗${NC}"
    ((ERRORS++))
fi

# Check npm
echo -n "npm version: "
if command -v npm &> /dev/null; then
    echo -e "${GREEN}$(npm -v) ✓${NC}"
else
    echo -e "${RED}Not installed ✗${NC}"
    ((ERRORS++))
fi

# Check backend .env
echo -n "Backend .env: "
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}Exists ✓${NC}"

    # Check for placeholder values
    if grep -q "your-claude-api-key-here" backend/.env 2>/dev/null; then
        echo -e "  ${YELLOW}⚠ ANTHROPIC_API_KEY appears to be placeholder${NC}"
        ((WARNINGS++))
    fi

    if grep -q "postgresql://user:password@localhost" backend/.env 2>/dev/null; then
        echo -e "  ${YELLOW}⚠ DATABASE_URL appears to be example value${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}Missing ✗${NC}"
    ((ERRORS++))
fi

# Check backend node_modules
echo -n "Backend dependencies: "
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}Installed ✓${NC}"
else
    echo -e "${RED}Not installed ✗${NC}"
    ((ERRORS++))
fi

# Check frontend node_modules
echo -n "Frontend dependencies: "
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}Installed ✓${NC}"
else
    echo -e "${RED}Not installed ✗${NC}"
    ((ERRORS++))
fi

# Check Prisma client
echo -n "Prisma client: "
if [ -d "backend/node_modules/.prisma/client" ]; then
    echo -e "${GREEN}Generated ✓${NC}"
else
    echo -e "${RED}Not generated ✗${NC}"
    echo -e "  ${YELLOW}Run: npm run db:generate${NC}"
    ((ERRORS++))
fi

# Check if ports are available
echo -n "Port 3000 (frontend): "
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}In use ⚠${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}Available ✓${NC}"
fi

echo -n "Port 3001 (backend): "
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}In use ⚠${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}Available ✓${NC}"
fi

# Database connectivity test
echo -n "Database connection: "
cd backend
DB_TEST=$(npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "SELECT 1;" 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Connected ✓${NC}"
else
    echo -e "${RED}Failed ✗${NC}"
    echo -e "  ${YELLOW}Check DATABASE_URL in backend/.env${NC}"
    ((ERRORS++))
fi
cd ..

echo ""
echo "===================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to develop.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found. System should work but check warnings.${NC}"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found. Please fix before starting development.${NC}"
    echo ""
    echo "Quick fixes:"
    echo "  - Run 'npm run setup' for initial setup"
    echo "  - Run 'npm run db:generate' to generate Prisma client"
    echo "  - Update backend/.env with valid credentials"
    exit 1
fi
