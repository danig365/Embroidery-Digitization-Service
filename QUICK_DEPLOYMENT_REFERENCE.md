# 🚀 Quick Deployment Reference Card

**Save this file for quick reference during deployment!**

---

## 📍 Key File Locations

| Purpose | File | Location |
|---------|------|----------|
| Frontend Config | config.js | `frontend/src/config.js` |
| Frontend Dev Env | .env | `frontend/.env` |
| Frontend Prod Env | .env.production | `frontend/.env.production` |
| Backend Dev Env | .env | `backend/.env` |
| Backend Prod Env | .env.production | `backend/.env.production` |
| Backend Settings | settings.py | `backend/studio/settings.py` |
| Docker Backend | Dockerfile.backend | Root directory |
| Docker Frontend | Dockerfile.frontend | Root directory |
| Docker Compose | docker-compose.yml | Root directory |
| Deployment Guide | DEPLOYMENT_INSTRUCTIONS.md | Root directory |
| Docker Guide | DOCKER_DEPLOYMENT_GUIDE.md | Root directory |

---

## 🔐 Critical Environment Variables

### Frontend (.env.production)
```
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
```

### Backend (.env.production)
```
SECRET_KEY=<random-string-here>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
FRONTEND_URL=https://yourdomain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
OPENAI_API_KEY=sk-proj-YOUR_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
DB_ENGINE=django.db.backends.postgresql
DB_NAME=embroidery_db
DB_USER=embroidery_user
DB_PASSWORD=strong_password
DB_HOST=localhost_or_RDS_endpoint
DB_PORT=5432
```

---

## ⚡ Quick Deployment (Docker - 5 minutes)

```bash
# 1. Update environment
cp backend/.env.production backend/.env
nano backend/.env  # Edit values

# 2. Build
docker-compose build

# 3. Start
docker-compose up -d

# 4. Setup
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser

# 5. SSL (separate)
certbot certonly --standalone -d yourdomain.com

# ✅ Done! Visit https://yourdomain.com
```

---

## 🖥️ Quick Deployment (Traditional - 20 minutes)

```bash
# Backend Setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.production .env
nano .env  # Edit values
python manage.py migrate
pip install gunicorn
gunicorn studio.wsgi --bind 0.0.0.0:8000 --workers 4

# Frontend Setup
cd frontend
npm install
npm run build
npm install -g serve
serve -s build -l 3000

# Nginx Config (see DEPLOYMENT_INSTRUCTIONS.md)

# SSL Setup
certbot certonly --nginx -d yourdomain.com

# ✅ Done!
```

---

## 🔍 Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| API 404 errors | Check `REACT_APP_API_URL` in .env.production |
| Images not loading | Verify `MEDIA_BASE_URL` is correct |
| CORS errors | Ensure `FRONTEND_URL` matches frontend domain |
| SSL certificate error | Run `certbot renew --dry-run` |
| Database connection failed | Check `DB_HOST`, `DB_NAME`, credentials |
| Static files 404 | Run `python manage.py collectstatic --noinput` |
| Services won't start | Check `systemctl status` and logs |

---

## 📋 Pre-Deployment Checklist (5 min)

- [ ] Domain DNS configured (A record points to server)
- [ ] Environment variables updated for production
- [ ] OpenAI API key configured
- [ ] Stripe live keys configured
- [ ] Database credentials set
- [ ] SSL certificate method chosen (Let's Encrypt or paid)
- [ ] Deployment method chosen (Docker or Traditional)
- [ ] Server has minimum specs (2GB RAM, 20GB disk)

---

## 🧪 Post-Deployment Tests

```bash
# Test API
curl https://yourdomain.com/api/

# Test Frontend
curl https://yourdomain.com/

# Test Admin
curl https://yourdomain.com/admin/

# Check SSL
curl -I https://yourdomain.com/

# Test Media Files
curl https://yourdomain.com/media/uploads/test.jpg
```

---

## 📊 File Size Reference

| Component | Size |
|-----------|------|
| Frontend build | ~3MB |
| Backend with venv | ~500MB |
| PostgreSQL (empty) | ~10MB |
| Media folder (starting) | ~100MB |
| **Total Initial** | **~650MB** |

---

## ⏱️ Typical Deployment Times

| Task | Time |
|------|------|
| Prepare server | 5 min |
| Docker build | 5 min |
| Initialize database | 2 min |
| Get SSL certificate | 5 min |
| Configure Nginx | 5 min |
| Deploy with Docker | **5 min total** |
| Deploy traditional | **20 min total** |

---

## 🆘 Emergency Contacts

**If deployment fails:**

1. Check logs: `docker logs container_name` or `journalctl -u service`
2. Verify environment variables
3. Test API connectivity manually
4. Check database connection
5. Review error messages carefully
6. Restart services: `docker-compose restart` or `systemctl restart service`

---

## 📞 Support URLs

- OpenAI API Status: https://status.openai.com/
- Stripe Status: https://status.stripe.com/
- Django Docs: https://docs.djangoproject.com/
- React Docs: https://react.dev/
- Docker Docs: https://docs.docker.com/

---

## 🎯 Critical Security Points

1. **Never commit .env files to git** ❌
2. **Change SECRET_KEY before deploying** ✅
3. **Use HTTPS everywhere** ✅
4. **Keep API keys secret** ✅
5. **Enable HSTS headers** ✅
6. **Use strong database passwords** ✅
7. **Regular backups** ✅
8. **Monitor error logs** ✅

---

## 📅 Maintenance Schedule

| Task | Frequency |
|------|-----------|
| Database backup | Daily |
| SSL renewal check | Weekly |
| Security updates | Monthly |
| Log rotation | Weekly |
| Performance review | Monthly |
| Full backup | Weekly |

---

## 🚨 Common Mistakes to Avoid

❌ **Don't**:
- Commit .env files to git
- Use localhost URLs in production
- Leave DEBUG=True in production
- Use weak database passwords
- Skip SSL certificate setup
- Ignore backup strategy
- Use same SECRET_KEY for all environments

✅ **Do**:
- Use environment variables for all secrets
- Test deployment on staging first
- Enable all security settings
- Keep detailed deployment notes
- Monitor logs regularly
- Document your configuration
- Have a rollback plan

---

## 📞 Quick Support

**Frontend issues?** → Check `config.js` and `.env.production`
**Backend issues?** → Check `settings.py` and `backend/.env`
**API issues?** → Run `curl https://yourdomain.com/api/`
**SSL issues?** → Run `certbot certificates`
**Database issues?** → Check connection string and credentials

---

**Remember**: When in doubt, check the deployment guide appropriate for your chosen method!

- **Docker Route**: See `DOCKER_DEPLOYMENT_GUIDE.md`
- **Traditional Route**: See `DEPLOYMENT_INSTRUCTIONS.md`

---

**Last Updated**: December 22, 2025
**Version**: 1.0.0
**Status**: Ready for Production Deployment ✅

