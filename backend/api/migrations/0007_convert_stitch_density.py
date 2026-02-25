# Generated migration to convert stitch_density from string to integer

from django.db import migrations

def convert_stitch_density(apps, schema_editor):
    """Convert string stitch_density values to integers"""
    Design = apps.get_model('api', 'Design')
    
    # Mapping of old string values to new integer values
    conversion_map = {
        'Low': 3,
        'Medium': 5,
        'High': 7,
        'Very High': 9,
    }
    
    for design in Design.objects.all():
        if isinstance(design.stitch_density, str):
            # Convert string value to integer
            new_value = conversion_map.get(design.stitch_density, 5)  # Default to 5 if not found
            design.stitch_density = new_value
            design.save()

def reverse_convert_stitch_density(apps, schema_editor):
    """Reverse conversion - not needed for this case"""
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_add_design_details'),
    ]

    operations = [
        migrations.RunPython(convert_stitch_density, reverse_convert_stitch_density),
    ]
