# Generated migration - Adds comprehensive design details fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_order_output_10o_order_output_cmd_order_output_ds9_and_more'),
    ]

    operations = [
        # Text Layer - FULL DETAILS
        migrations.AddField(
            model_name='design',
            name='text_size',
            field=models.IntegerField(default=36),
        ),
        migrations.AddField(
            model_name='design',
            name='text_color',
            field=models.CharField(default='#000000', max_length=7),
        ),
        migrations.AddField(
            model_name='design',
            name='text_outline_color',
            field=models.CharField(default='#FFFFFF', max_length=7),
        ),
        migrations.AddField(
            model_name='design',
            name='text_outline_thickness',
            field=models.IntegerField(default=2),
        ),
        migrations.AddField(
            model_name='design',
            name='text_position_x',
            field=models.IntegerField(default=50),
        ),
        migrations.AddField(
            model_name='design',
            name='text_position_y',
            field=models.IntegerField(default=50),
        ),
        # Update existing text fields
        migrations.AlterField(
            model_name='design',
            name='text_font',
            field=models.CharField(default='Arial', max_length=100),
        ),
        migrations.AlterField(
            model_name='design',
            name='text_style',
            field=models.CharField(default='Regular', max_length=50),
        ),
        
        # Thread Colors - FULL DETAILS
        migrations.AddField(
            model_name='design',
            name='thread_brand',
            field=models.CharField(default='Madeira', max_length=50),
        ),
        migrations.AddField(
            model_name='design',
            name='thread_notes',
            field=models.TextField(blank=True, null=True),
        ),
        
        # Embroidery Settings - FULL DETAILS
        migrations.AlterField(
            model_name='design',
            name='stitch_density',
            field=models.IntegerField(default=5),
        ),
        migrations.AddField(
            model_name='design',
            name='stitch_type',
            field=models.CharField(default='Satin', max_length=50),
        ),
        migrations.AddField(
            model_name='design',
            name='underlay',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='design',
            name='jump_trim',
            field=models.BooleanField(default=True),
        ),
        
        # Canvas/Design Settings
        migrations.AddField(
            model_name='design',
            name='design_width',
            field=models.IntegerField(default=100),
        ),
        migrations.AddField(
            model_name='design',
            name='design_height',
            field=models.IntegerField(default=100),
        ),
        migrations.AddField(
            model_name='design',
            name='hoop_size',
            field=models.CharField(default='100x100mm', max_length=50),
        ),
        migrations.AddField(
            model_name='design',
            name='rotation',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='design',
            name='mirror_horizontal',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='design',
            name='mirror_vertical',
            field=models.BooleanField(default=False),
        ),
    ]
