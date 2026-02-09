#!/bin/bash
# Smart Home IoT - Unified Test Runner
# Runs all tests across backend, frontend, and firmware

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default: run all tests
RUN_BACKEND=true
RUN_FRONTEND=true
RUN_FIRMWARE=true
VERBOSE=false
COVERAGE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only)
            RUN_FRONTEND=false
            RUN_FIRMWARE=false
            shift
            ;;
        --frontend-only)
            RUN_BACKEND=false
            RUN_FIRMWARE=false
            shift
            ;;
        --firmware-only)
            RUN_BACKEND=false
            RUN_FRONTEND=false
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --coverage|-c)
            COVERAGE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --backend-only    Run only backend tests"
            echo "  --frontend-only   Run only frontend tests"
            echo "  --firmware-only   Run only firmware tests"
            echo "  --coverage, -c    Generate coverage reports"
            echo "  --verbose, -v     Verbose output"
            echo "  --help, -h        Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}=== Smart Home IoT Test Runner ===${NC}"
echo ""

OVERALL_RESULT=0

# Backend Tests
if [ "$RUN_BACKEND" = true ]; then
    echo -e "${BLUE}Running Backend Tests...${NC}"
    if [ -d "backend" ] && [ -f "backend/requirements.txt" ]; then
        cd backend
        
        # Activate virtual environment if it exists
        if [ -d "venv" ]; then
            source venv/bin/activate
        fi
        
        if [ "$COVERAGE" = true ]; then
            echo "Running with coverage..."
            pytest tests/ --cov=src --cov-report=html --cov-report=term
            BACKEND_RESULT=$?
            echo -e "${GREEN}Coverage report: backend/htmlcov/index.html${NC}"
        else
            if [ "$VERBOSE" = true ]; then
                pytest tests/ -v
            else
                pytest tests/
            fi
            BACKEND_RESULT=$?
        fi
        
        if [ -d "venv" ]; then
            deactivate
        fi
        
        cd ..
        
        if [ $BACKEND_RESULT -eq 0 ]; then
            echo -e "${GREEN}✓ Backend tests passed${NC}"
        else
            echo -e "${RED}✗ Backend tests failed${NC}"
            OVERALL_RESULT=1
        fi
    else
        echo -e "${YELLOW}⚠ Backend tests not found or not configured${NC}"
    fi
    echo ""
fi

# Frontend Tests
if [ "$RUN_FRONTEND" = true ]; then
    echo -e "${BLUE}Running Frontend Tests...${NC}"
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        cd frontend
        
        if [ "$COVERAGE" = true ]; then
            echo "Running with coverage..."
            npm test -- --coverage --watchAll=false
            FRONTEND_RESULT=$?
            echo -e "${GREEN}Coverage report: frontend/coverage/lcov-report/index.html${NC}"
        else
            if [ "$VERBOSE" = true ]; then
                npm test -- --verbose --watchAll=false
            else
                CI=true npm test
            fi
            FRONTEND_RESULT=$?
        fi
        
        cd ..
        
        if [ $FRONTEND_RESULT -eq 0 ]; then
            echo -e "${GREEN}✓ Frontend tests passed${NC}"
        else
            echo -e "${RED}✗ Frontend tests failed${NC}"
            OVERALL_RESULT=1
        fi
    else
        echo -e "${YELLOW}⚠ Frontend tests not found or not configured${NC}"
    fi
    echo ""
fi

# Firmware Tests
if [ "$RUN_FIRMWARE" = true ]; then
    echo -e "${BLUE}Running Firmware Tests...${NC}"
    if [ -d "firmware" ] && [ -f "firmware/platformio.ini" ]; then
        if command -v pio >/dev/null 2>&1; then
            cd firmware
            
            if [ "$VERBOSE" = true ]; then
                pio test -v
            else
                pio test
            fi
            FIRMWARE_RESULT=$?
            
            cd ..
            
            if [ $FIRMWARE_RESULT -eq 0 ]; then
                echo -e "${GREEN}✓ Firmware tests passed${NC}"
            else
                echo -e "${RED}✗ Firmware tests failed${NC}"
                OVERALL_RESULT=1
            fi
        else
            echo -e "${YELLOW}⚠ PlatformIO not installed - skipping firmware tests${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Firmware tests not found or not configured${NC}"
    fi
    echo ""
fi

# Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
if [ $OVERALL_RESULT -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
fi

exit $OVERALL_RESULT
