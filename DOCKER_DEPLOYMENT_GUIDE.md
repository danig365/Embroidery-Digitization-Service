# Docker Deployment Guide

Deploy Embroidery Studio using Docker and Docker Compose for easy production setup.

## Prerequisites

- Docker installed (https://docs.docker.com/get-docker/)
- Docker Compose installed (https://docs.docker.com/compose/install/)
- A server with at least 2GB RAM and 20GB disk space

## Quick Start (Development)

```bash
# Clone repository
git clone <your-repo> /opt/embroidery-studio
cd /opt/embroidery-studio

# Copy example environment files
cp .env.example .env
cp backend/.env.production backend/.env

# Edit environment variables
nano .env
nano backend/.env

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Production Deployment

### Step 1: Prepare Server

```bash
# SSH into your server
ssh root@yourdomain.com

# Update system
apt-get update && apt-get upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/embroidery-studio
cd /opt/embroidery-studio
```

### Step 2: Clone and Configure

```bash
# Clone repository (or upload files)
git clone <your-repo> .

# Create production environment files
cat > .env.production <<EOF
DEBUG=False
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
FRONTEND_URL=https://yourdomain.com

DB_NAME=embroidery_db
DB_USER=embroidery_user
DB_PASSWORD=$(openssl rand -base64 32)

OPENAI_API_KEY=your-key-here
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
EOF

# Create nginx configuration
cat > nginx.conf <<'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 10M;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;

        # Backend API
        location /api/ {
            proxy_pass http://backend:8000/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Media files
        location /media/ {
            alias /app/backend/media/;
            expires 30d;
        }

        # Static files
        location /static/ {
            alias /app/backend/staticfiles/;
            expires 30d;
        }

        # Frontend
        location / {
            proxy_pass http://frontend:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF
```

### Step 3: Build and Start Services

```bash
# Build images
docker-compose build

# Start services in background
docker-compose up -d

# Wait for services to be healthy
sleep 30

# Run migrations
docker-compose exec backend python manage.py migrate

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Check status
docker-compose ps
```

### Step 4: SSL Certificate with Let's Encrypt

```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Get certificate (stop nginx temporarily)
docker-compose pause nginx
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
docker-compose unpause nginx

# Verify certificate
certbot certificates

# Auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer
```

### Step 5: Firewall Configuration

```bash
# Enable firewall
ufw enable

# Allow ports
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Check status
ufw status
```

### Step 6: Set Up Monitoring

```bash
# Create monitoring script
cat > /opt/embroidery-studio/monitor.sh <<'EOF'
#!/bin/bash
LOGFILE="/var/log/embroidery-monitor.log"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check Docker containers
    BACKEND=$(docker-compose ps backend | grep -c "Up")
    FRONTEND=$(docker-compose ps frontend | grep -c "Up")
    DB=$(docker-compose ps postgres | grep -c "Up")
    
    if [ $BACKEND -eq 0 ] || [ $FRONTEND -eq 0 ] || [ $DB -eq 0 ]; then
        echo "$TIMESTAMP - WARNING: Service down! Backend: $BACKEND, Frontend: $FRONTEND, DB: $DB" >> $LOGFILE
        docker-compose restart
    fi
    
    sleep 300  # Check every 5 minutes
done
EOF

chmod +x /opt/embroidery-studio/monitor.sh

# Run as background service
nohup /opt/embroidery-studio/monitor.sh > /dev/null 2>&1 &
```

### Step 7: Backup Strategy

```bash
# Create backup script
cat > /opt/embroidery-studio/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p $BACKUP_DIR

# Database backup
docker-compose exec -T postgres pg_dump -U embroidery_user embroidery_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Media files backup
tar -czf $BACKUP_DIR/media_$DATE.tar.gz ./backend/media

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete

echo "Backup completed: db_$DATE.sql.gz and media_$DATE.tar.gz"
EOF

chmod +x /opt/embroidery-studio/backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/embroidery-studio/backup.sh" | crontab -
```

## Common Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Access Django admin
# Visit: https://yourdomain.com/admin

# SSH into container
docker-compose exec backend bash
docker-compose exec frontend bash
docker-compose exec postgres psql -U embroidery_user -d embroidery_db

# Restart services
docker-compose restart backend
docker-compose restart frontend

# Stop services
docker-compose stop

# Remove all containers and volumes
docker-compose down -v

# Pull latest code and redeploy
git pull
docker-compose build
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

## Troubleshooting

### Services won't start
```bash
# Check Docker status
systemctl status docker

# View error logs
docker-compose logs backend
docker-compose logs postgres

# Restart Docker
systemctl restart docker
```

### Database connection issues
```bash
# Check PostgreSQL connectivity
docker-compose exec postgres psql -U embroidery_user -d embroidery_db -c "SELECT 1"

# Reset database (warning: deletes all data)
docker-compose down -v
docker-compose up -d postgres
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS embroidery_db; CREATE DATABASE embroidery_db OWNER embroidery_user;"
docker-compose up -d
```

### Static/Media files not loading
```bash
# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput

# Check file permissions
ls -la ./backend/media/
ls -la ./backend/staticfiles/

# Restart nginx
docker-compose restart nginx
```

### API 404 errors
```bash
# Check backend status
docker-compose ps backend

# View backend logs
docker-compose logs backend

# Test API directly
curl http://localhost:8000/api/auth/login/
```

## Performance Optimization

### For high traffic:

```yaml
# In docker-compose.yml, increase worker processes:
services:
  backend:
    environment:
      # Add more workers for 4GB+ RAM servers
      WORKERS: 8
    command: sh -c "python manage.py migrate && gunicorn studio.wsgi --bind 0.0.0.0:8000 --workers ${WORKERS}"
```

### Enable caching:

```bash
# Add Redis to docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Scaling with Load Balancer

For multiple backend instances, use Docker Swarm or Kubernetes. This requires more advanced configuration.

## Support

Check logs and status with:
```bash
docker-compose logs -f
docker-compose ps
docker stats
```

