#!/bin/bash

# Test runner script for backend-fastapi
# Usage: ./run_tests.sh [pytest arguments]
# Examples:
#   ./run_tests.sh                    # Run all tests
#   ./run_tests.sh -v                 # Run with verbose output
#   ./run_tests.sh tests/test_api.py  # Run specific test file
#   ./run_tests.sh -k "test_create"   # Run tests matching pattern
#   ./run_tests.sh --cov=app          # Run with coverage

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Running Backend Tests${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please create it first:"
    echo "   python3 -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

echo -e "${GREEN}✓${NC} Activating virtual environment..."
source venv/bin/activate

# Set PYTHONPATH to include the current directory
export PYTHONPATH="${SCRIPT_DIR}:${PYTHONPATH}"

# Load test environment variables
if [ -f ".env.test" ]; then
    echo -e "${GREEN}✓${NC} Loading test environment..."
    export $(grep -v '^#' .env.test | xargs)
fi

# Run pytest with provided arguments or defaults
echo -e "${GREEN}✓${NC} Running tests..."
echo ""

if [ $# -eq 0 ]; then
    # No arguments provided, run all tests in tests/ directory
    pytest -v tests/
else
    # Pass all arguments to pytest
    pytest "$@"
fi

# Store exit code
TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "⚠️  Some tests failed. See output above for details."
fi

exit $TEST_EXIT_CODE
