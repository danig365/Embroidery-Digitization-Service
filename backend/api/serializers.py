from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, TokenPackage, TokenTransaction, 
    Design, Order, Cart, DesignFeature, DesignFeatureUsage,
    EmailVerificationToken, PasswordResetToken, Conversation, Message,
    OrderResource
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
    normal_image = serializers.SerializerMethodField()
    embroidery_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = Design
        fields = [
            'id', 'user', 'user_username', 'name', 
            # Images
            'normal_image', 'embroidery_preview',
            # AI Generation
            'prompt', 
            # Machine Settings
            'machine_brand', 'requested_format', 'embroidery_size_cm',
            # Metadata
            'status', 'tokens_used', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']
    
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

# ============================================================================
# ORDER RESOURCE SERIALIZERS
# ============================================================================

class OrderResourceSerializer(serializers.ModelSerializer):
    """Serializer for extra order resource files"""
    file_url = serializers.SerializerMethodField()
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True, default='')
    
    class Meta:
        model = OrderResource
        fields = ['id', 'order', 'file_url', 'original_name', 'file_size', 'description',
                  'uploaded_by', 'uploaded_by_username', 'created_at']
        read_only_fields = ['id', 'order', 'created_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            url = obj.file.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None


# ============================================================================
# CHAT SERIALIZERS
# ============================================================================

class MessageSerializer(serializers.ModelSerializer):
    """Serializer for individual messages"""
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    is_admin = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    has_attachment = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_id', 'sender_username', 'is_admin', 'content', 
                  'attachment_url', 'attachment_name', 'attachment_size', 'attachment_type', 'has_attachment',
                  'created_at', 'is_read', 'read_at']
        read_only_fields = ['id', 'created_at', 'is_read', 'read_at']
    
    def get_is_admin(self, obj):
        """Check if sender is an admin/staff member"""
        return obj.sender.is_staff
    
    def get_attachment_url(self, obj):
        """Get absolute URL for attachment"""
        if obj.attachment:
            request = self.context.get('request')
            url = obj.attachment.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversations with nested messages"""
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    admin_username = serializers.CharField(source='admin.username', read_only=True, allow_null=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'order', 'order_number', 'customer', 'customer_username', 'admin', 'admin_username', 'messages', 'unread_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'order', 'customer', 'created_at', 'updated_at']
    
    def get_unread_count(self, obj):
        """Count unread messages"""
        return obj.messages.filter(is_read=False).count()


class ConversationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for conversation lists"""
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    admin_username = serializers.CharField(source='admin.username', read_only=True, allow_null=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_status = serializers.CharField(source='order.status', read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'order', 'order_number', 'order_status', 'customer', 'customer_username', 'admin', 'admin_username', 'last_message', 'unread_count', 'updated_at']
        read_only_fields = ['id', 'order', 'customer', 'updated_at']
    
    def get_last_message(self, obj):
        """Get the last message in the conversation"""
        last_msg = obj.messages.last()
        if last_msg:
            return {
                'id': last_msg.id,
                'sender_username': last_msg.sender.username,
                'content': last_msg.content[:100] if last_msg.content else '',
                'has_attachment': last_msg.has_attachment,
                'attachment_name': last_msg.attachment_name or '',
                'created_at': last_msg.created_at
            }
        return None
    
    def get_unread_count(self, obj):
        """Count unread messages for current user"""
        request = self.context.get('request')
        if request and request.user:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0