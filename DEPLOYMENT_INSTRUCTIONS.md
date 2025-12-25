# Embroidery Studio - Deployment Guide

This guide will help you deploy the Embroidery Studio application to a production server with a custom domain and HTTPS.

## Overview

The application consists of:
- **Frontend**: React app (port 3000)
- **Backend**: Django REST API (port 8000)
- **Database**: SQLite (development) or PostgreSQL (production)
- **Media Storage**: Local filesystem or AWS S3

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Domain name with DNS pointing to your server
- SSL certificate (Let's Encrypt - free)
- Node.js 16+ and Python 3.10+

## Step 1: Prepare Your Server

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y python3-pip python3-venv nodejs npm nginx postgresql postgresql-contrib

# Create application user
sudo useradd -m -s /bin/bash embroidery
sudo su - embroidery
```

## Step 2: Clone and Setup Backend

```bash
# Clone repository
git clone <your-repo-url> /home/embroidery/embroidery-studio
cd /home/embroidery/embroidery-studio/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt

# Create .env file from .env.production template
cp .env.production .env

# Edit .env with your production values
nano .env
```

### Important: Update these in .env:
```
SECRET_KEY=<generate-new-random-key>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
FRONTEND_URL=https://yourdomain.com
OPENAI_API_KEY=<your-key>
STRIPE_SECRET_KEY=<your-live-key>
STRIPE_PUBLISHABLE_KEY=<your-live-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
```

### Setup Database (PostgreSQL)

```bash
# Create database and user (as root or with sudo)
sudo -u postgres psql <<EOF
CREATE DATABASE embroidery_db;
CREATE USER embroidery_user WITH PASSWORD 'strong_password_here';
ALTER ROLE embroidery_user SET client_encoding TO 'utf8';
ALTER ROLE embroidery_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE embroidery_user SET default_transaction_deferrable TO on;
ALTER ROLE embroidery_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE embroidery_db TO embroidery_user;
\q
EOF

# Add to .env:
# DB_ENGINE=django.db.backends.postgresql
# DB_NAME=embroidery_db
# DB_USER=embroidery_user
# DB_PASSWORD=strong_password_here
# DB_HOST=localhost
# DB_PORT=5432
```

### Run Migrations

```bash
# From backend directory with venv activated
python manage.py migrate
python manage.py collectstatic --noinput

# Create superuser
python manage.py createsuperuser
```

## Step 3: Setup Gunicorn (Production Server)

```bash
# Still in backend directory with venv activated
pip install gunicorn

# Test gunicorn
gunicorn studio.wsgi --bind 0.0.0.0:8000 --workers 4

# Create systemd service
sudo nano /etc/systemd/system/embroidery-api.service
```

### Content for embroidery-api.service:
```ini
[Unit]
Description=Embroidery Studio API
After=network.target

[Service]
User=embroidery
WorkingDirectory=/home/embroidery/embroidery-studio/backend
ExecStart=/home/embroidery/embroidery-studio/backend/venv/bin/gunicorn \
    studio.wsgi --bind 0.0.0.0:8000 --workers 4 \
    --timeout 120 --access-logfile - --error-logfile -

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable embroidery-api
sudo systemctl start embroidery-api
sudo systemctl status embroidery-api
```

## Step 4: Setup Frontend (Node.js)

```bash
cd /home/embroidery/embroidery-studio/frontend

# Create .env.production with:
# REACT_APP_API_URL=https://yourdomain.com/api
# REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Install dependencies
npm install

# Build for production
npm run build

# Create systemd service for frontend
sudo nano /etc/systemd/system/embroidery-frontend.service
```

### Content for embroidery-frontend.service:
```ini
[Unit]
Description=Embroidery Studio Frontend
After=network.target

[Service]
User=embroidery
WorkingDirectory=/home/embroidery/embroidery-studio/frontend
ExecStart=/usr/bin/npm run serve
Environment=NODE_ENV=production

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable embroidery-frontend
sudo systemctl start embroidery-frontend
```

## Step 5: Setup Nginx (Reverse Proxy)

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/embroidery-studio
```

### Nginx Configuration:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 120;
        proxy_send_timeout 120;
        proxy_read_timeout 120;
    }

    # Media Files
    location /media/ {
        alias /home/embroidery/embroidery-studio/backend/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Static Files
    location /static/ {
        alias /home/embroidery/embroidery-studio/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Frontend (React)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support if needed
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/embroidery-studio /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## Step 6: Setup SSL Certificate (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Step 7: Update Django Settings

The settings.py already reads from environment variables. Make sure these are set for production:

```python
# In settings.py (already configured):
DEBUG = os.getenv('DEBUG', 'True') == 'True'  # Set to False in production
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', ...).split(',')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

## Step 8: Firewall Configuration

```bash
sudo ufw enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw status
```

## Step 9: Monitoring and Logs

```bash
# View backend logs
sudo journalctl -u embroidery-api -f

# View frontend logs
sudo journalctl -u embroidery-frontend -f

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Step 10: Backup Strategy

```bash
# Create backup script
sudo nano /usr/local/bin/backup-embroidery.sh
```

### Backup Script Content:
```bash
#!/bin/bash
BACKUP_DIR="/home/embroidery/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
DB_BACKUP="$BACKUP_DIR/db_$DATE.sql"
MEDIA_BACKUP="$BACKUP_DIR/media_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U embroidery_user embroidery_db > $DB_BACKUP
gzip $DB_BACKUP

# Backup media files
tar -czf $MEDIA_BACKUP /home/embroidery/embroidery-studio/backend/media

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete

echo "Backup completed: $DB_BACKUP.gz and $MEDIA_BACKUP"
```

```bash
# Make executable and schedule with cron
sudo chmod +x /usr/local/bin/backup-embroidery.sh
sudo crontab -e

# Add: 0 2 * * * /usr/local/bin/backup-embroidery.sh (daily at 2 AM)
```

## Troubleshooting

### API connection issues
```bash
# Check if backend is running
sudo systemctl status embroidery-api

# Check port 8000
sudo netstat -tuln | grep 8000

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Static/Media files not loading
```bash
# Ensure permissions are correct
sudo chown -R embroidery:embroidery /home/embroidery/embroidery-studio

# Collect static files again
cd /home/embroidery/embroidery-studio/backend
source venv/bin/activate
python manage.py collectstatic --noinput
```

### SSL Certificate issues
```bash
# Check certificate validity
sudo certbot certificates

# Renew manually
sudo certbot renew --dry-run
```

## Production Checklist

- [ ] Domain name configured with DNS
- [ ] SSL certificate installed and auto-renewing
- [ ] PostgreSQL database setup and backed up
- [ ] Environment variables configured
- [ ] Backend running with Gunicorn
- [ ] Frontend built and running
- [ ] Nginx reverse proxy configured
- [ ] Firewall rules applied
- [ ] Backup strategy implemented
- [ ] Monitoring and logging setup
- [ ] Tested all core features
- [ ] Set up uptime monitoring
- [ ] Configured email service for notifications
- [ ] Documented admin procedures

## Support

For issues, check:
1. Service status: `sudo systemctl status embroidery-api`
2. Logs: `/var/log/nginx/` and `journalctl`
3. Environment variables in `.env`
4. Database connectivity
5. API response in browser: `https://yourdomain.com/api/`

