#!/bin/bash

set -e

echo "🧭 Compass Development Environment Setup"
echo "========================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version OK: $(node -v)${NC}"
echo ""

# Check if PostgreSQL is accessible
echo "Checking PostgreSQL availability..."
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL client found${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL client not found locally (Railway deployment may be used)${NC}"
fi
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}⚠ No .env file found. Copying from .env.example${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠ Please update backend/.env with your actual credentials${NC}"
    else
        echo -e "${RED}✗ No .env.example found. Cannot create .env${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Backend .env file exists${NC}"
fi

npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate
echo -e "${GREEN}✓ Prisma client generated${NC}"
echo ""

# Check if DATABASE_URL is set
if grep -q "DATABASE_URL=\"postgresql://user:password" .env; then
    echo -e "${YELLOW}⚠ DATABASE_URL appears to be the example value${NC}"
    echo -e "${YELLOW}  Please update backend/.env with your actual database URL${NC}"
    echo ""
fi

cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

cd ..

# Summary
echo "========================================"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your database credentials"
echo "2. Run 'npm run db:migrate' to set up the database"
echo "3. Run 'npm run dev' to start development servers"
echo ""
echo "For health check, run: npm run verify"
