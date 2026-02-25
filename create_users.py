import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studio.settings')
django.setup()

from django.contrib.auth.models import User

# Create superuser admin
try:
    if not User.objects.filter(username='admin').exists():
        superuser = User.objects.create_superuser('admin', 'admin@example.com', 'admin')
        print("✓ Superuser created: admin")
    else:
        print("✓ Superuser already exists: admin")
except Exception as e:
    print(f"✗ Superuser creation error: {e}")

# Create simple user
try:
    if not User.objects.filter(email='danishrehman78677@gmail.com').exists():
        user1 = User.objects.create_user('danishrehman78677', 'danishrehman78677@gmail.com', '00000000')
        print("✓ Simple user created: danishrehman78677@gmail.com")
    else:
        print("✓ Simple user already exists: danishrehman78677@gmail.com")
except Exception as e:
    print(f"✗ User 1 creation error: {e}")

# Create admin role user
try:
    if not User.objects.filter(email='danishwithfiverr326@gmail.com').exists():
        user2 = User.objects.create_user('danishwithfiverr326', 'danishwithfiverr326@gmail.com', '00000000')
        user2.is_staff = True
        user2.is_superuser = True
        user2.save()
        print("✓ Admin role user created: danishwithfiverr326@gmail.com")
    else:
        print("✓ Admin role user already exists: danishwithfiverr326@gmail.com")
except Exception as e:
    print(f"✗ User 2 creation error: {e}")

print("\n✓ All users created successfully!")
