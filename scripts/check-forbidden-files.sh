#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

FORBIDDEN_FILES=(
  "backend/test-api.js"
)

VIOLATIONS=()
for relative_path in "${FORBIDDEN_FILES[@]}"; do
  if [ -e "$REPO_ROOT/$relative_path" ]; then
    VIOLATIONS+=("$relative_path")
  fi
done

if [ ${#VIOLATIONS[@]} -eq 0 ]; then
  exit 0
fi

echo "Forbidden files detected (violates REQ-SEC-001):"
for file in "${VIOLATIONS[@]}"; do
  echo "  - $file"
done

exit 1
