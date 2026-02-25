import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


def parse_csv_env(env_name, default=''):
    value = os.getenv(env_name, default)
    return [item.strip() for item in value.split(',') if item.strip()]

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default-key')
# DEBUG defaults to False for production safety - set DEBUG=True only in development
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')
ALLOWED_HOSTS = parse_csv_env(
    'ALLOWED_HOSTS',
    '46.224.219.127,127.0.0.1,localhost,aiembroideryfiles.com,www.aiembroideryfiles.com,broderiemagique.com,www.broderiemagique.com'
)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://46.224.219.127')
GOOGLE_OAUTH_CLIENT_ID = os.getenv('GOOGLE_OAUTH_CLIENT_ID', '').strip()
GOOGLE_OAUTH_CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET', '').strip()
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'studio.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'studio.wsgi.application'

# Database configuration - PostgreSQL for production, SQLite for development
DB_ENGINE = os.getenv('DB_ENGINE', 'django.db.backends.postgresql')

if DB_ENGINE == 'django.db.backends.postgresql':
    # Production: PostgreSQL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'embroidery_db'),
            'USER': os.getenv('DB_USER', 'embroidery_user'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'postgres'),
            'PORT': os.getenv('DB_PORT', '5432'),
            'ATOMIC_REQUESTS': True,  # Ensure data consistency
            'CONN_MAX_AGE': 600,  # Connection pooling
        }
    }
else:
    # Development: SQLite (only if explicitly set)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Settings - Configure allowed frontend origins
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'False') == 'True'
CORS_ALLOWED_ORIGINS = parse_csv_env(
    'CORS_ALLOWED_ORIGINS',
    'http://46.224.219.127,http://46.224.219.127:3000,http://46.224.219.127:8000,http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000,https://aiembroideryfiles.com,https://www.aiembroideryfiles.com,https://broderiemagique.com,https://www.broderiemagique.com'
)

CSRF_TRUSTED_ORIGINS = parse_csv_env(
    'CSRF_TRUSTED_ORIGINS',
    'http://46.224.219.127,http://localhost:3000,http://127.0.0.1:3000,https://aiembroideryfiles.com,https://www.aiembroideryfiles.com,https://broderiemagique.com,https://www.broderiemagique.com'
)

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# Request/Response Timeouts
REQUEST_TIMEOUT = 180  # 3 minutes for heavy operations
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 240  # 4 minutes warning

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
}

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp']
MAX_IMAGE_SIZE = 5242880  # 5MB

# Security Settings for Production
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False') == 'True'
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False') == 'True'
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False') == 'True'
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', 0))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'False') == 'True'
SECURE_HSTS_PRELOAD = os.getenv('SECURE_HSTS_PRELOAD', 'False') == 'True'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Create media directories
os.makedirs(MEDIA_ROOT / 'uploads', exist_ok=True)
os.makedirs(MEDIA_ROOT / 'outputs', exist_ok=True)
os.makedirs(MEDIA_ROOT / 'generated', exist_ok=True)

# Email Settings (add this section if not present)
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)