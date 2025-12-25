from django.core.management.base import BaseCommand
from api.models import TokenPackage


class Command(BaseCommand):
    help = 'Seeds token packages with new pricing structure'

    def handle(self, *args, **kwargs):
        # Delete old packages
        TokenPackage.objects.all().delete()
        
        # Create new packages
        packages = [
            {
                'name': 'Starter',
                'tokens': 10,
                'price': 49.00,
                'savings_percentage': 0,
                'is_popular': False,
                'features': [
                    '10 design generations',
                    'All file formats (DST, PES, JEF, etc.)',
                    'Email notifications',
                    'Save to account',
                    '30-day validity'
                ]
            },
            {
                'name': 'Professional',
                'tokens': 25,
                'price': 99.00,
                'savings_percentage': 20,
                'is_popular': True,
                'features': [
                    '25 design generations',
                    'All file formats included',
                    'Priority email notifications',
                    'Unlimited saves',
                    '90-day validity',
                    'Priority support'
                ]
            },
            {
                'name': 'Enterprise',
                'tokens': 50,
                'price': 179.00,
                'savings_percentage': 27,
                'is_popular': False,
                'features': [
                    '50 design generations',
                    'All file formats included',
                    'Instant email notifications',
                    'Unlimited saves',
                    '180-day validity',
                    'Priority support',
                    'Bulk order discounts'
                ]
            }
        ]
        
        for pkg_data in packages:
            pkg = TokenPackage.objects.create(**pkg_data)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created: {pkg.name} - {pkg.tokens} tokens - ${pkg.price} '
                    f'(${pkg.price_per_token:.2f}/token)'
                )
            )
        
        self.stdout.write(self.style.SUCCESS('\n✅ Token packages seeded successfully!'))
