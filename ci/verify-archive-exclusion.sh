#!/bin/bash
# Archive Exclusion Verification Script
# Verifies that archive/ directory is excluded from all builds and packages
# Part of Task 2.4: Archive exclusion from builds

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

VERBOSE=false
EXIT_CODE=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [-v|--verbose]"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Archive Exclusion Verification${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check 1: Verify archive/ not in Rust workspace members
echo -e "${YELLOW}[1/6] Checking Rust workspace configuration...${NC}"
if grep -q "archive" backend/Cargo.toml; then
    if grep -A 20 "^\[workspace\]" backend/Cargo.toml | grep -q "archive"; then
        echo -e "${RED}  ✗ FAIL: archive/ found in Cargo.toml workspace members${NC}"
        EXIT_CODE=1
    else
        echo -e "${GREEN}  ✓ PASS: archive/ not in Cargo.toml workspace members${NC}"
    fi
else
    echo -e "${GREEN}  ✓ PASS: archive/ not in Cargo.toml workspace members${NC}"
fi

# Check 2: Verify archive/ in TypeScript exclude lists
echo ""
echo -e "${YELLOW}[2/6] Checking TypeScript configuration...${NC}"

if grep -q '"archive"' frontend/tsconfig.json; then
    echo -e "${GREEN}  ✓ PASS: archive/ in tsconfig.json exclude list${NC}"
else
    echo -e "${RED}  ✗ FAIL: archive/ not in tsconfig.json exclude list${NC}"
    EXIT_CODE=1
fi

if grep -q '"archive"' frontend/tsconfig.build.json; then
    echo -e "${GREEN}  ✓ PASS: archive/ in tsconfig.build.json exclude list${NC}"
else
    echo -e "${RED}  ✗ FAIL: archive/ not in tsconfig.build.json exclude list${NC}"
    EXIT_CODE=1
fi

# Check 3: Verify archive/ in .dockerignore
echo ""
echo -e "${YELLOW}[3/6] Checking Docker ignore configuration...${NC}"
if grep -q "^archive" .dockerignore; then
    echo -e "${GREEN}  ✓ PASS: archive/ in .dockerignore${NC}"
else
    echo -e "${RED}  ✗ FAIL: archive/ not in .dockerignore${NC}"
    EXIT_CODE=1
fi

# Check 4: Verify Dockerfile doesn't copy archive/
echo ""
echo -e "${YELLOW}[4/6] Checking Dockerfile...${NC}"
if grep -q "COPY.*archive" Dockerfile.backend; then
    echo -e "${RED}  ✗ FAIL: Dockerfile.backend copies archive/ directory${NC}"
    EXIT_CODE=1
else
    echo -e "${GREEN}  ✓ PASS: Dockerfile.backend doesn't copy archive/${NC}"
fi

# Check 5: Verify build scripts don't reference archive/
echo ""
echo -e "${YELLOW}[5/6] Checking build scripts...${NC}"
FOUND_ARCHIVE_REF=false

for script in build-prod.bat build-prod.sh; do
    if [ -f "$script" ]; then
        if grep -q "archive" "$script"; then
            echo -e "${RED}  ✗ FAIL: $script references archive/ directory${NC}"
            FOUND_ARCHIVE_REF=true
            EXIT_CODE=1
        fi
    fi
done

if [ "$FOUND_ARCHIVE_REF" = false ]; then
    echo -e "${GREEN}  ✓ PASS: Build scripts don't reference archive/${NC}"
fi

# Check 6: Verify installer scripts don't copy archive/
echo ""
echo -e "${YELLOW}[6/6] Checking installer scripts...${NC}"
FOUND_ARCHIVE_COPY=false

if [ -d "installer" ]; then
    while IFS= read -r -d '' script; do
        if grep -q "archive" "$script"; then
            echo -e "${RED}  ✗ FAIL: $(basename "$script") references archive/ directory${NC}"
            if [ "$VERBOSE" = true ]; then
                echo -e "${GRAY}    File: $script${NC}"
            fi
            FOUND_ARCHIVE_COPY=true
            EXIT_CODE=1
        fi
    done < <(find installer -type f \( -name "*.ps1" -o -name "*.sh" \) -print0)
fi

if [ "$FOUND_ARCHIVE_COPY" = false ]; then
    echo -e "${GREEN}  ✓ PASS: Installer scripts don't reference archive/${NC}"
fi

# Summary
echo ""
echo -e "${CYAN}========================================${NC}"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}archive/ directory is properly excluded from builds${NC}"
else
    echo -e "${RED}✗ Some checks failed!${NC}"
    echo -e "${RED}Please fix the issues above${NC}"
fi
echo -e "${CYAN}========================================${NC}"
echo ""

exit $EXIT_CODE
