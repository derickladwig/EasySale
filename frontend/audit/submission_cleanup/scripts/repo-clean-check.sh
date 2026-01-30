#!/bin/bash
# ============================================
# Repo Clean Check Script (Bash version)
# ============================================
# Purpose: Verify no build artifacts or garbage files are tracked in git
# Usage: Run from frontend/ directory
#        ./audit/submission_cleanup/scripts/repo-clean-check.sh
# Exit Codes:
#   0 = Clean (no issues found)
#   1 = Dirty (issues found - see output)
# ============================================

set -e

ERROR_COUNT=0
WARNING_COUNT=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((ERROR_COUNT++)) || true
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNING_COUNT++)) || true
}

# ============================================
# CHECK 1: Zero-Byte Garbage Files
# ============================================
print_header "Check 1: Zero-Byte Garbage Files in Root"

ZERO_BYTE_FILES=$(find . -maxdepth 1 -type f -empty -not -name ".*" 2>/dev/null || true)

if [ -n "$ZERO_BYTE_FILES" ]; then
    print_fail "Found zero-byte files in frontend root:"
    echo "$ZERO_BYTE_FILES" | while read -r file; do
        echo -e "  - ${RED}$file${NC}"
    done
    
    # Check if tracked
    echo "$ZERO_BYTE_FILES" | while read -r file; do
        if git ls-files --error-unmatch "$file" &>/dev/null; then
            echo -e "    ${YELLOW}git rm --cached \"$file\"${NC}"
        fi
    done
else
    print_pass "No zero-byte files found in frontend root"
fi

# ============================================
# CHECK 2: Tracked Artifact Directories
# ============================================
print_header "Check 2: Tracked Artifact Directories"

ARTIFACT_PATTERNS="^dist/|^coverage/|^playwright-report/|^test-results/|^storybook-static/|^node_modules/|^\.vite/"

TRACKED_ARTIFACTS=$(git ls-files 2>/dev/null | grep -E "$ARTIFACT_PATTERNS" || true)

if [ -n "$TRACKED_ARTIFACTS" ]; then
    print_fail "Found tracked artifact files/directories:"
    echo "$TRACKED_ARTIFACTS" | while read -r file; do
        echo -e "  - ${RED}$file${NC}"
    done
    
    # Get unique directories
    DIRS=$(echo "$TRACKED_ARTIFACTS" | cut -d'/' -f1 | sort -u)
    echo -e "\n${YELLOW}Cleanup commands:${NC}"
    echo "$DIRS" | while read -r dir; do
        echo -e "  ${YELLOW}git rm --cached -r $dir/${NC}"
    done
else
    print_pass "No artifact directories are tracked"
fi

# ============================================
# CHECK 3: Generated Output Files
# ============================================
print_header "Check 3: Generated Output Files"

GENERATED_PATTERNS="lint-errors\.txt|test-output\.txt|badge-size-verification\.html|\.verification\.html$|\.log\.txt$"

TRACKED_GENERATED=$(git ls-files 2>/dev/null | grep -E "$GENERATED_PATTERNS" || true)

if [ -n "$TRACKED_GENERATED" ]; then
    print_fail "Found tracked generated output files:"
    echo "$TRACKED_GENERATED" | while read -r file; do
        echo -e "  - ${RED}$file${NC}"
        echo -e "    ${YELLOW}git rm --cached $file${NC}"
    done
else
    print_pass "No generated output files are tracked"
fi

# ============================================
# CHECK 4: Suspicious Filename Patterns
# ============================================
print_header "Check 4: Suspicious Filename Patterns"

# Files that look like code fragments
SUSPICIOUS=$(git ls-files 2>/dev/null | grep -E "^\(|^\{|^\[|^f\.|^set[A-Z]|^setTimeout|^setInterval|^console\.|=>$" | grep -v -E "\.(ts|tsx|js|jsx|json|md|css|html|svg|png|jpg)$" || true)

if [ -n "$SUSPICIOUS" ]; then
    print_fail "Found suspicious filenames (possible code fragments):"
    echo "$SUSPICIOUS" | while read -r file; do
        echo -e "  - ${RED}\"$file\"${NC}"
    done
else
    print_pass "No suspicious filename patterns found"
fi

# ============================================
# CHECK 5: .gitignore Coverage
# ============================================
print_header "Check 5: .gitignore Coverage"

REQUIRED_PATTERNS=(
    "node_modules/"
    "dist/"
    "coverage/"
    "playwright-report/"
    "test-results/"
    "storybook-static/"
    ".vite/"
)

if [ -f ".gitignore" ]; then
    MISSING_PATTERNS=()
    for pattern in "${REQUIRED_PATTERNS[@]}"; do
        if ! grep -qF "$pattern" .gitignore; then
            MISSING_PATTERNS+=("$pattern")
        fi
    done
    
    if [ ${#MISSING_PATTERNS[@]} -gt 0 ]; then
        print_warn ".gitignore is missing recommended patterns:"
        for pattern in "${MISSING_PATTERNS[@]}"; do
            echo -e "  - ${YELLOW}$pattern${NC}"
        done
    else
        print_pass ".gitignore contains all required patterns"
    fi
else
    print_fail ".gitignore file not found!"
fi

# ============================================
# SUMMARY
# ============================================
print_header "SUMMARY"

if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    echo -e "\n${GREEN}✅ Repository is CLEAN - no issues found!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Repository has issues:${NC}"
    echo -e "   Errors:   ${RED}$ERROR_COUNT${NC}"
    echo -e "   Warnings: ${YELLOW}$WARNING_COUNT${NC}"
    
    if [ $ERROR_COUNT -gt 0 ]; then
        echo -e "\n${YELLOW}Run the cleanup commands above to fix errors.${NC}"
        echo -e "${YELLOW}See: frontend/audit/submission_cleanup/02_GIT_TRACKING_AUDIT.md${NC}"
        exit 1
    else
        echo -e "\n${YELLOW}Warnings are advisory - review and address as needed.${NC}"
        exit 0
    fi
fi
