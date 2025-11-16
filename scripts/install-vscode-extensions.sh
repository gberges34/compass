#!/bin/bash

# VS Code Extensions Installation Script for Compass
# Installs all recommended extensions for the Compass codebase

set -e

echo "🔌 Compass VS Code Extensions Setup"
echo "===================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if VS Code CLI is available
echo "Checking VS Code CLI availability..."
if ! command -v code &> /dev/null; then
    echo -e "${RED}✗ VS Code CLI ('code' command) not found${NC}"
    echo ""
    echo "To enable the VS Code CLI:"
    echo "1. Open VS Code"
    echo "2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)"
    echo "3. Type 'Shell Command: Install code command in PATH'"
    echo "4. Select it and restart your terminal"
    echo ""
    echo "Alternatively, you can install extensions manually:"
    echo "- VS Code will prompt you when you open this workspace"
    echo "- Or use: Extensions view (Cmd+Shift+X) and search for each extension"
    exit 1
fi
echo -e "${GREEN}✓ VS Code CLI found${NC}"
echo ""

# Array of extension IDs to install
EXTENSIONS=(
    "Prisma.prisma"
    "dbaeumer.vscode-eslint"
    "esbenp.prettier-vscode"
    "bradlc.vscode-tailwindcss"
    "Orta.vscode-jest"
    "firsttris.vscode-jest-runner"
    "ckolkman.vscode-postgres"
    "usernamehw.errorlens"
    "eamodio.gitlens"
    "christian-kohler.path-intellisense"
    "formulahendry.auto-rename-tag"
    "humao.rest-client"
    "mikestead.dotenv"
    "yzhang.markdown-all-in-one"
    "Gruntfuggly.todo-tree"
)

# Counters
INSTALLED=0
SKIPPED=0
FAILED=0

echo "Installing VS Code extensions..."
echo ""

# Install each extension
for EXTENSION in "${EXTENSIONS[@]}"; do
    echo -n "Installing ${BLUE}${EXTENSION}${NC}... "
    
    # Check if extension is already installed
    if code --list-extensions | grep -q "^${EXTENSION}$"; then
        echo -e "${YELLOW}⏭ Already installed${NC}"
        ((SKIPPED++))
    else
        # Try to install the extension
        if code --install-extension "${EXTENSION}" --force &> /dev/null; then
            echo -e "${GREEN}✓ Installed${NC}"
            ((INSTALLED++))
        else
            echo -e "${RED}✗ Failed${NC}"
            ((FAILED++))
        fi
    fi
done

echo ""
echo "===================================="
echo -e "${GREEN}✓ Extension installation complete!${NC}"
echo ""
echo "Summary:"
echo -e "  ${GREEN}Installed: ${INSTALLED}${NC}"
echo -e "  ${YELLOW}Skipped (already installed): ${SKIPPED}${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "  ${RED}Failed: ${FAILED}${NC}"
fi
echo ""
echo "Next steps:"
echo "1. Reload VS Code window (Cmd+R / Ctrl+R) to activate extensions"
echo "2. Configure ESLint and Prettier if needed"
echo "3. Check extension settings in VS Code preferences"
echo ""

