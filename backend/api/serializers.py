from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, TokenPackage, TokenTransaction, 
    Design, Order, Cart, DesignFeature, DesignFeatureUsage,
    EmailVerificationToken, PasswordResetToken
)

class UserSerializer(serializers.ModelSerializer):
    tokens = serializers.IntegerField(source='profile.tokens', read_only=True)
    email_verified = serializers.BooleanField(source='profile.email_verified', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'tokens', 'email_verified', 'is_staff', 'is_superuser']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=True)
    full_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'full_name']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # Set first_name and last_name if full_name provided
        if full_name:
            name_parts = full_name.split(' ', 1)
            user.first_name = name_parts[0]
            if len(name_parts) > 1:
                user.last_name = name_parts[1]
            user.save()
        
        # Create profile with 0 tokens (will get 50 after email verification)
        UserProfile.objects.create(user=user, tokens=0, email_verified=False)
        
        # Create and send verification token
        verification_token = EmailVerificationToken.objects.create(user=user)
        verification_token.send_verification_email()
        
        return user


class TokenPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TokenPackage
        fields = ['id', 'name', 'tokens', 'price', 'price_per_token', 'savings_percentage', 'is_popular', 'features']


class TokenTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TokenTransaction
        fields = ['id', 'type', 'amount', 'description', 'created_at']


class DesignSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    uploaded_image = serializers.SerializerMethodField()
    normal_image = serializers.SerializerMethodField()
    embroidery_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = Design
        fields = [
            'id', 'user', 'user_username', 'name', 
            # Images
            'uploaded_image', 'normal_image', 'embroidery_preview',
            # AI Generation
            'prompt', 'style', 
            # Text Layer - FULL DETAILS
            'text_content', 'text_font', 'text_style', 'text_size',
            'text_color', 'text_outline_color', 'text_outline_thickness',
            'text_position_x', 'text_position_y',
            # Thread Colors - FULL DETAILS
            'thread_colors', 'thread_brand', 'thread_notes',
            # Embroidery Settings - FULL DETAILS
            'stitch_density', 'stitch_type', 'auto_trim', 'underlay', 'jump_trim',
            # Canvas Settings
            'canvas_width', 'canvas_height', 'design_width', 'design_height',
            'hoop_size', 'rotation', 'mirror_horizontal', 'mirror_vertical',
            'embroidery_size_cm',
            # Metadata
            'status', 'tokens_used', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_uploaded_image(self, obj):
        if obj.uploaded_image:
            request = self.context.get('request')
            url = obj.uploaded_image.url
            if request:
                # If URL doesn't start with http, build absolute URI
                if not url.startswith('http'):
                    return request.build_absolute_uri(url)
                return url
            return url
        return None
    
    def get_normal_image(self, obj):
        if obj.normal_image:
            request = self.context.get('request')
            url = obj.normal_image.url
            if request:
                # If URL doesn't start with http, build absolute URI
                if not url.startswith('http'):
                    return request.build_absolute_uri(url)
                return url
            return url
        return None
    
    def get_embroidery_preview(self, obj):
        if obj.embroidery_preview:
            request = self.context.get('request')
            # Get the URL from the file field
            url = obj.embroidery_preview.url
            if request:
                # If URL doesn't start with http, build absolute URI
                if not url.startswith('http'):
                    return request.build_absolute_uri(url)
                return url
            return url
        return None


class OrderSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    design_name = serializers.SerializerMethodField()
    design_preview = serializers.SerializerMethodField()
    design_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'user_username', 'user_email', 'user_first_name', 'user_last_name',
            'design', 'design_name', 'design_preview', 'design_details',
            'status', 'tokens_used', 'embroidery_size_cm', 'requested_formats',
            # Industrial formats
            'output_dst', 'output_dsb', 'output_dsz', 'output_exp', 'output_tbf', 'output_fdr', 'output_stx',
            # Domestic formats
            'output_pes', 'output_pec', 'output_jef', 'output_sew', 'output_hus', 'output_vip', 'output_vp3', 'output_xxx',
            # Commercial formats
            'output_cmd', 'output_tap', 'output_tim', 'output_emt', 'output_10o', 'output_ds9',
            'email_sent', 'notification_sent_at',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['order_number', 'user', 'created_at', 'updated_at']
    
    def get_design_name(self, obj):
        return obj.design.name if obj.design else "Deleted Design"
    
    def get_design_preview(self, obj):
        if not obj.design:
            return None
        if obj.design.embroidery_preview:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.design.embroidery_preview.url)
            return obj.design.embroidery_preview.url
        elif obj.design.normal_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.design.normal_image.url)
            return obj.design.normal_image.url
        return None
    
    def get_design_details(self, obj):
        if obj.design:
            request = self.context.get('request')
            return DesignSerializer(obj.design, context={'request': request}).data
        return None


class CartSerializer(serializers.ModelSerializer):
    design_details = DesignSerializer(source='design', read_only=True)
    
    class Meta:
        model = Cart
        fields = ['id', 'user', 'design', 'design_details', 'added_at']
        read_only_fields = ['user', 'added_at']


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)


class DesignFeatureSerializer(serializers.ModelSerializer):
    """Serializer for premium design features"""
    class Meta:
        model = DesignFeature
        fields = [
            'id', 'name', 'description', 'tokens_required', 'category',
            'is_active', 'is_popular', 'sort_order', 'icon_emoji',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class DesignFeatureUsageSerializer(serializers.ModelSerializer):
    """Serializer for tracking feature usage on designs"""
    feature_name = serializers.CharField(source='feature.name', read_only=True)
    class Meta:
        model = DesignFeatureUsage
        fields = ['id', 'design', 'feature', 'feature_name', 'tokens_spent', 'used_at']
        read_only_fields = ['tokens_spent', 'used_at']


class EmbroiderySizePricingSerializer(serializers.ModelSerializer):
    """Serializer for embroidery size-based pricing"""
    class Meta:
        from .models import EmbroiderySizePricing
        model = EmbroiderySizePricing
        fields = ['id', 'size_cm', 'price_in_tokens', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
