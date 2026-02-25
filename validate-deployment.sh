#!/bin/bash

# Quick deployment validation script
# Validates that the application is ready for deployment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Embroidery Digitization Service - Deployment Validation"
echo "==========================================================="
echo ""

# Check if Docker is installed
echo "Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed"
else
    echo -e "${RED}✗${NC} Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
echo "Checking Docker Compose installation..."
if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose is installed"
else
    echo -e "${RED}✗${NC} Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
echo "Checking environment configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
else
    echo -e "${YELLOW}⚠${NC} .env file not found"
    echo "   Creating .env from .env.production template..."
    cp .env.production .env
    echo -e "${YELLOW}   Please update .env with your production values!${NC}"
fi

# Check required environment variables
echo "Checking required environment variables..."
REQUIRED_VARS=("SECRET_KEY" "ALLOWED_HOSTS" "DB_PASSWORD" "OPENAI_API_KEY" "STRIPE_SECRET_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" .env; then
        VALUE=$(grep "^$var=" .env | cut -d'=' -f2-)
        if [[ $VALUE == *"your-"* ]] || [[ $VALUE == *"change-this"* ]] || [ -z "$VALUE" ]; then
            MISSING_VARS+=("$var")
            echo -e "${YELLOW}⚠${NC} $var not properly configured"
        else
            echo -e "${GREEN}✓${NC} $var is configured"
        fi
    else
        MISSING_VARS+=("$var")
        echo -e "${YELLOW}⚠${NC} $var is missing"
    fi
done

# Check project structure
echo ""
echo "Checking project structure..."
REQUIRED_DIRS=("backend" "frontend" "backend/media" "backend/staticfiles")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $dir exists"
    else
        echo -e "${RED}✗${NC} $dir is missing"
    fi
done

# Check required files
echo ""
echo "Checking required configuration files..."
REQUIRED_FILES=("docker-compose.yml" "nginx.conf" "Dockerfile.backend" "Dockerfile.frontend")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file is missing"
    fi
done

# Summary
echo ""
echo "==========================================================="
if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Ready to deploy! Run:"
    echo "  docker-compose build"
    echo "  docker-compose up -d"
    echo ""
    echo "Or use the automated script:"
    echo "  ./deploy.sh"
else
    echo -e "${YELLOW}⚠ Please configure the following variables in .env:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "After updating .env, run this script again to validate."
fi
echo ""
