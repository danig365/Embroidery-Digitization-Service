# 📋 Complete Deployment Checklist

## ✅ Pre-Deployment Setup (Complete)

- [x] Repository cloned from GitHub
- [x] Project structure verified
- [x] All dependencies configured
- [x] Docker & Docker Compose verified
- [x] Deployment documentation created
- [x] Scripts created and made executable
- [x] Environment templates created
- [x] Nginx configuration ready
- [x] Media/staticfiles directories created

## 🔧 Configuration Required (TODO)

- [ ] **Update `.env` file** with production values:
  ```bash
  nano .env
  ```
  - [ ] Set unique `SECRET_KEY`
  - [ ] Set `ALLOWED_HOSTS` to both domains
  - [ ] Set `DB_PASSWORD` to a strong password
  - [ ] Add `OPENAI_API_KEY`
  - [ ] Add `STRIPE_SECRET_KEY`
  - [ ] Add `STRIPE_PUBLISHABLE_KEY`
  - [ ] Add `STRIPE_WEBHOOK_SECRET`
  - [ ] Set `FRONTEND_URL` to production primary domain
  - [ ] Set `CORS_ALLOWED_ORIGINS` with both HTTPS domains
  - [ ] Set `CSRF_TRUSTED_ORIGINS` with both HTTPS domains
  - [ ] Update any email settings

## 🐳 Docker Deployment (TODO)

- [ ] Run validation: `./validate-deployment.sh`
- [ ] Build Docker images: `docker-compose build`
- [ ] Start services: `docker-compose up -d`
- [ ] Verify all services running: `docker-compose ps`

## 🗄️ Database Setup (TODO)

- [ ] Run migrations: `docker-compose exec backend python manage.py migrate`
- [ ] Create superuser: `docker-compose exec backend python manage.py createsuperuser`
- [ ] Seed data (optional): `docker-compose exec backend python manage.py seed_packages`

## 📦 Static Files & Frontend (TODO)

- [ ] Collect static files: `docker-compose exec backend python manage.py collectstatic --noinput`
- [ ] Build React frontend: `docker-compose exec frontend npm run build`

## 🔒 Security & SSL (TODO)

- [ ] Install Certbot: `sudo apt-get install certbot python3-certbot-nginx -y`
- [ ] Generate SSL cert for both domains:
  - [ ] `sudo certbot --nginx -d aiembroideryfiles.com -d www.aiembroideryfiles.com -d broderiemagique.com -d www.broderiemagique.com`
- [ ] Switch to SSL-ready nginx config: `cp nginx.ssl.conf nginx.conf`
- [ ] Restart nginx container: `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx`
- [ ] Update nginx.conf SSL paths (uncomment SSL lines)
- [ ] Verify HTTPS works on both domains
- [ ] Enable HSTS header in nginx

## ✅ Post-Deployment Testing (TODO)

- [ ] Access frontend: `https://aiembroideryfiles.com` and `https://broderiemagique.com`
- [ ] Access admin: `https://aiembroideryfiles.com/admin`
- [ ] Test user registration
- [ ] Test user login
- [ ] Test design upload
- [ ] Test API endpoints
- [ ] Verify database connectivity
- [ ] Check backend logs: `docker-compose logs backend`
- [ ] Check frontend logs: `docker-compose logs frontend`

## 🔐 Production Security (TODO)

- [ ] Verify `DEBUG=False`
- [ ] Enable SSL redirect in nginx
- [ ] Configure CORS origins
- [ ] Set secure cookie flags
- [ ] Enable HSTS headers
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Enable audit logging

## 📊 Monitoring & Backups (TODO)

- [ ] Set up database backups:
  ```bash
  docker-compose exec postgres pg_dump -U embroidery_user embroidery_db > backup.sql
  ```
- [ ] Set up automated backup schedule
- [ ] Configure log aggregation
- [ ] Set up error alerts
- [ ] Monitor disk space
- [ ] Monitor database size

## 🎯 Integration Setup (TODO)

- [ ] Configure Stripe webhooks
- [ ] Test Stripe payment flow
- [ ] Configure OpenAI API calls
- [ ] Set up email notifications
- [ ] Test error notifications
- [ ] Configure payment test mode

## 📚 Documentation (TODO)

- [ ] Review DEPLOYMENT.md
- [ ] Review PRODUCTION_README.md
- [ ] Document any custom configurations
- [ ] Create runbook for common tasks
- [ ] Document emergency procedures

## 🚨 Disaster Recovery (TODO)

- [ ] Test database restore from backup
- [ ] Document recovery procedures
- [ ] Set up automated backups
- [ ] Test failover procedures
- [ ] Document incident response

## 📞 Final Verification (TODO)

- [ ] All services running: `docker-compose ps`
- [ ] No errors in logs: `docker-compose logs`
- [ ] Database healthy: `docker-compose exec postgres pg_isready`
- [ ] API responding: `curl https://aiembroideryfiles.com/api/`
- [ ] Frontend loading in EN: `https://aiembroideryfiles.com`
- [ ] Frontend loading in FR: `https://broderiemagique.com`
- [ ] SSL certificate valid
- [ ] Admin accessible

## 📅 Maintenance Schedule

### Daily
- [ ] Check logs for errors
- [ ] Verify all services running
- [ ] Monitor disk space

### Weekly
- [ ] Review error logs
- [ ] Test backup/restore
- [ ] Check for dependency updates

### Monthly
- [ ] Full security audit
- [ ] Performance review
- [ ] Backup verification
- [ ] Update dependencies if needed

## 🆘 Quick Command Reference

```bash
# Start/Stop
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose restart        # Restart all services

# Logs
docker-compose logs -f        # View all logs
docker-compose logs -f backend # View backend logs
docker-compose logs -f postgres # View database logs

# Database
docker-compose exec backend python manage.py migrate  # Run migrations
docker-compose exec postgres pg_dump -U embroidery_user embroidery_db > backup.sql  # Backup

# Admin
docker-compose exec backend python manage.py createsuperuser  # Create admin
docker-compose exec backend python manage.py shell  # Python shell

# Cleanup
docker-compose down -v        # Remove all volumes
docker system prune -a        # Clean up Docker
```

## 📝 Notes

- Keep this checklist updated
- Document any custom changes
- Record all API keys securely
- Test backup/restore regularly
- Monitor production regularly

---

**Status**: 🟡 In Progress (Configuration needed)

**Last Updated**: February 7, 2026

**Next Action**: Update `.env` file with production values
