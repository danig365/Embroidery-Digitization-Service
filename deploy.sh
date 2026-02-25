#!/bin/bash

# Deployment initialization script
# Run this script to prepare the application for production deployment

set -e

echo "🚀 Starting Embroidery Digitization Service deployment..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Copying from .env.production..."
    cp .env.production .env
    echo "✅ .env file created. Please update with your production values."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/media/uploads
mkdir -p backend/media/outputs
mkdir -p backend/media/generated
mkdir -p backend/media/designs/normal
mkdir -p backend/media/designs/embroidery

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "📊 Running database migrations..."
docker-compose exec -T backend python manage.py migrate

# Collect static files
echo "📦 Collecting static files..."
docker-compose exec -T backend python manage.py collectstatic --noinput

# Build frontend
echo "⚛️  Building React frontend..."
docker-compose exec -T frontend npm run build

echo "✅ Deployment initialization complete!"
echo ""
echo "Next steps:"
echo "1. Create a superuser: docker-compose exec backend python manage.py createsuperuser"
echo "2. Verify services: docker-compose ps"
echo "3. Check logs: docker-compose logs -f"
echo "4. Access admin: https://your-domain.com/admin"
echo ""
