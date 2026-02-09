#!/bin/bash
# Smart Home IoT - Development Environment Setup Script
# Sets up all dependencies for backend, frontend, and firmware development

set -e

echo "=== Smart Home IoT Development Environment Setup ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "README.md" ] || [ ! -d "backend" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "Step 1: Checking prerequisites..."
echo ""

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✓${NC} Python 3 installed: $PYTHON_VERSION"
else
    echo -e "${RED}✗${NC} Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 16+"
    exit 1
fi

# Check Docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    echo -e "${GREEN}✓${NC} Docker installed: $DOCKER_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Docker not found. Some features will be unavailable."
fi

# Check PlatformIO (optional)
if command_exists pio; then
    echo -e "${GREEN}✓${NC} PlatformIO installed"
else
    echo -e "${YELLOW}⚠${NC} PlatformIO not found. Firmware development will be unavailable."
fi

echo ""
echo "Step 2: Setting up Python virtual environment..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓${NC} Virtual environment created"
else
    echo -e "${YELLOW}⚠${NC} Virtual environment already exists"
fi

echo "Activating virtual environment and installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
if [ -f "requirements-dev.txt" ]; then
    pip install -r requirements-dev.txt
fi
echo -e "${GREEN}✓${NC} Python dependencies installed"
deactivate
cd ..

echo ""
echo "Step 3: Setting up Node.js dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓${NC} Node.js dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} node_modules already exists. Run 'npm install' manually if needed."
fi
cd ..

echo ""
echo "Step 4: Setting up environment files..."
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✓${NC} Created backend/.env from template"
        echo -e "${YELLOW}⚠${NC} Please update backend/.env with your configuration"
    fi
else
    echo -e "${YELLOW}⚠${NC} backend/.env already exists"
fi

if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env
        echo -e "${GREEN}✓${NC} Created frontend/.env from template"
    fi
else
    echo -e "${YELLOW}⚠${NC} frontend/.env already exists"
fi

echo ""
echo "Step 5: Setting up infrastructure..."
if command_exists docker-compose || command_exists docker; then
    cd infrastructure
    echo "Starting Docker containers..."
    if command_exists docker-compose; then
        docker-compose up -d
    else
        docker compose up -d
    fi
    echo -e "${GREEN}✓${NC} Docker containers started"
    cd ..
else
    echo -e "${YELLOW}⚠${NC} Skipping Docker setup - Docker not available"
fi

echo ""
echo "Step 6: Generating certificates..."
if [ -f "certs/generate.sh" ]; then
    cd certs
    if [ ! -f "ca.crt" ]; then
        chmod +x generate.sh
        ./generate.sh
        echo -e "${GREEN}✓${NC} Certificates generated"
    else
        echo -e "${YELLOW}⚠${NC} Certificates already exist"
    fi
    cd ..
fi

echo ""
echo "Step 7: Setting up firmware (optional)..."
if command_exists pio && [ -f "firmware/platformio.ini" ]; then
    cd firmware
    pio pkg install
    echo -e "${GREEN}✓${NC} Firmware dependencies installed"
    cd ..
else
    echo -e "${YELLOW}⚠${NC} Skipping firmware setup"
fi

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Update configuration files:"
echo "     - backend/.env"
echo "     - frontend/.env"
echo ""
echo "  2. Start the backend:"
echo "     cd backend && source venv/bin/activate && python src/app.py"
echo ""
echo "  3. Start the frontend:"
echo "     cd frontend && npm start"
echo ""
echo "  4. Access the dashboard:"
echo "     http://localhost:3000"
echo ""
echo "For more information, see README.md"
echo ""
