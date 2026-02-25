from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import secrets
from datetime import timedelta

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    tokens = models.IntegerField(default=0)  # Changed from 50 to 0 (will get after verification)
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.tokens} tokens"

    def has_tokens(self, amount):
        return self.tokens >= amount

    def deduct_tokens(self, amount):
        if self.has_tokens(amount):
            self.tokens -= amount
            self.save()
            return True
        return False


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_tokens')
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.user.username} - {self.token[:20]}..."
    
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def send_verification_email(self):
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={self.token}"
        subject = "Verify Your Email - AI Embroidery Studio"
        message = f"""
Hello {self.user.username},

Welcome to AI Embroidery Studio! 🎨

Please verify your email address by clicking the link below:

{verification_url}

This link will expire in 24 hours.

After verification, you'll receive 50 free tokens to start creating beautiful embroidery designs!

If you didn't create an account, please ignore this email.

Best regards,
AI Embroidery Studio Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [self.user.email],
            fail_silently=False,
        )


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.user.username} - Password Reset"
    
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def send_reset_email(self):
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={self.token}"
        subject = "Reset Your Password - AI Embroidery Studio"
        message = f"""
Hello {self.user.username},

We received a request to reset your password for AI Embroidery Studio.

Click the link below to reset your password:

{reset_url}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

Best regards,
AI Embroidery Studio Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [self.user.email],
            fail_silently=False,
        )


class TokenPackage(models.Model):
    name = models.CharField(max_length=100)
    tokens = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_token = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    savings_percentage = models.IntegerField(default=0)
    is_popular = models.BooleanField(default=False)
    features = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.tokens > 0:
            self.price_per_token = self.price / self.tokens
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.tokens} tokens - ${self.price}"


class TokenTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('purchase', 'Purchase'),
        ('usage', 'Usage'),
        ('refund', 'Refund'),
        ('welcome_bonus', 'Welcome Bonus'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.IntegerField()
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.type} - {self.amount} tokens"


class Design(models.Model):
    """Stores user designs with embroidery preview images"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('ready', 'Ready'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='designs')
    name = models.CharField(max_length=255, default='Untitled Design')
    
    # Images
    normal_image = models.ImageField(upload_to='designs/normal/', null=True, blank=True)
    embroidery_preview = models.ImageField(upload_to='designs/embroidery/', null=True, blank=True)
    
    # AI Generation
    prompt = models.TextField(blank=True, null=True)
    
    # Machine Settings
    machine_brand = models.CharField(max_length=100, blank=True, null=True, help_text="Customer's embroidery machine brand")
    requested_format = models.CharField(max_length=10, blank=True, null=True, help_text="Customer's preferred file format (pes, exp, jef, etc.)")
    embroidery_size_cm = models.IntegerField(default=10, help_text="Embroidery size in centimeters (5-40 cm)")
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    tokens_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.name}"


class Order(models.Model):
    """Tracks digitization orders submitted for manual processing"""
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    order_number = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    design = models.ForeignKey(Design, on_delete=models.CASCADE, related_name='orders')
    
    # Order details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    tokens_used = models.IntegerField(default=2)
    embroidery_size_cm = models.IntegerField(default=10, help_text="Embroidery size in centimeters (5-40 cm)")
    
    # Requested file formats (JSON list of format codes like ["dst", "pes", "jef"])
    requested_formats = models.JSONField(default=list, blank=True)
    
    # Output files (uploaded by admin after manual digitization)
    # Industrial formats
    output_dst = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_dsb = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_dsz = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_exp = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_tbf = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_fdr = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_stx = models.FileField(upload_to='orders/output/', null=True, blank=True)
    
    # Domestic formats
    output_pes = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_pec = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_jef = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_sew = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_hus = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_vip = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_vp3 = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_xxx = models.FileField(upload_to='orders/output/', null=True, blank=True)
    
    # Commercial formats
    output_cmd = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_tap = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_tim = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_emt = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_10o = models.FileField(upload_to='orders/output/', null=True, blank=True)
    output_ds9 = models.FileField(upload_to='orders/output/', null=True, blank=True)
    
    # Email notifications
    email_sent = models.BooleanField(default=False)
    notification_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Admin notes
    admin_notes = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.order_number:
            # Generate order number: ORD-2024-001
            from django.utils import timezone
            year = timezone.now().year
            last_order = Order.objects.filter(
                order_number__startswith=f'ORD-{year}-'
            ).order_by('-order_number').first()
            
            if last_order:
                last_num = int(last_order.order_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.order_number = f'ORD-{year}-{new_num:03d}'
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.order_number} - {self.user.username} - {self.status}"


class Cart(models.Model):
    """Shopping cart for designs before order submission"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_items')
    design = models.ForeignKey(Design, on_delete=models.CASCADE)
    embroidery_size_cm = models.IntegerField(default=10, help_text="Embroidery size in centimeters (5-40 cm)")
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'design')
        ordering = ['-added_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.design.name} ({self.embroidery_size_cm}cm)"


class DesignFeature(models.Model):
    """Premium features that customers can add to designs, with token costs"""
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField()
    tokens_required = models.IntegerField(default=10)  # Token cost for this feature
    category = models.CharField(
        max_length=50,
        choices=[
            ('text', 'Text Customization'),
            ('color', 'Color Options'),
            ('effect', 'Special Effects'),
            ('quality', 'Quality Enhancement'),
            ('rush', 'Rush Processing'),
            ('support', 'Premium Support'),
        ],
        default='effect'
    )
    is_active = models.BooleanField(default=True)
    is_popular = models.BooleanField(default=False)  # Featured feature
    sort_order = models.IntegerField(default=0)  # For sorting in UI
    icon_emoji = models.CharField(max_length=10, default='✨')  # For UI display
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.name} ({self.tokens_required} tokens)"


class DesignFeatureUsage(models.Model):
    """Tracks which features customers have used on their designs"""
    design = models.ForeignKey(Design, on_delete=models.CASCADE, related_name='feature_usages')
    feature = models.ForeignKey(DesignFeature, on_delete=models.CASCADE)
    tokens_spent = models.IntegerField()
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('design', 'feature')
        ordering = ['-used_at']
        indexes = [
            models.Index(fields=['design']),
            models.Index(fields=['feature']),
        ]

    def __str__(self):
        return f"{self.design.name} - {self.feature.name}"

class TokenCostSettings(models.Model):
    """Global settings for token costs across the system"""
    ai_image_generation = models.IntegerField(default=2, help_text="Tokens cost for generating AI images")
    order_placement = models.IntegerField(default=1, help_text="Tokens cost for placing an order")
    embroidery_preview = models.IntegerField(default=1, help_text="Tokens cost for embroidery preview")
    text_addition = models.IntegerField(default=1, help_text="Tokens cost for adding text to designs")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Token Cost Settings"
    
    def __str__(self):
        return "Token Cost Settings"
    
    @classmethod
    def get_costs(cls):
        """Get or create default token costs"""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class EmbroiderySizePricing(models.Model):
    """Pricing tiers based on embroidery size (in centimeters)"""
    size_cm = models.IntegerField(unique=True, help_text="Embroidery size in centimeters")
    price_in_tokens = models.IntegerField(help_text="Token cost for this size")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['size_cm']
        verbose_name = "Embroidery Size Pricing"
        verbose_name_plural = "Embroidery Size Pricing"
    
    def __str__(self):
        return f"{self.size_cm}cm - {self.price_in_tokens} tokens"
    
    @classmethod
    def get_price_for_size(cls, size_cm):
        """
        Get token price for a given size using linear interpolation.
        
        Example:
        - 5cm = 10 tokens
        - 40cm = 30 tokens
        - 20cm = ~19 tokens (interpolated)
        """
        # Get all pricing tiers
        tiers = cls.objects.all().order_by('size_cm')
        
        if not tiers.exists():
            # Default fallback if no tiers configured
            return 10
        
        # If size is below minimum, use minimum price
        min_tier = tiers.first()
        if size_cm <= min_tier.size_cm:
            return min_tier.price_in_tokens
        
        # If size is above maximum, use maximum price
        max_tier = tiers.last()
        if size_cm >= max_tier.size_cm:
            return max_tier.price_in_tokens
        
        # Find the two tiers to interpolate between
        for i, tier in enumerate(tiers):
            if tier.size_cm >= size_cm:
                if tier.size_cm == size_cm:
                    return tier.price_in_tokens
                
                # Interpolate between this tier and the previous one
                prev_tier = tiers[i - 1]
                size_range = tier.size_cm - prev_tier.size_cm
                price_range = tier.price_in_tokens - prev_tier.price_in_tokens
                
                # Linear interpolation formula
                ratio = (size_cm - prev_tier.size_cm) / size_range
                interpolated_price = prev_tier.price_in_tokens + (price_range * ratio)
                
                return int(round(interpolated_price))
        
        return max_tier.price_in_tokens


# ============================================================================
# ORDER RESOURCES (Extra files uploaded by admin)
# ============================================================================

class OrderResource(models.Model):
    """Extra resource files uploaded by admin for an order (not required for completion)"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='resources')
    file = models.FileField(upload_to='orders/resources/%Y/%m/')
    original_name = models.CharField(max_length=255)
    file_size = models.IntegerField(default=0)  # Size in bytes
    description = models.CharField(max_length=500, blank=True, default='')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Resource: {self.original_name} for {self.order.order_number}"


# ============================================================================
# CHAT/MESSAGING
# ============================================================================

class Conversation(models.Model):
    """Represents a chat conversation between a customer and admin about an order"""
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='conversation')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customer_conversations')
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='admin_conversations')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Chat - Order {self.order.order_number} ({self.customer.username})"


class Message(models.Model):
    """Individual chat message in a conversation"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(blank=True, default='')
    
    # Attachment fields
    attachment = models.FileField(upload_to='chat_attachments/%Y/%m/', null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True, default='')
    attachment_size = models.IntegerField(null=True, blank=True)  # Size in bytes
    attachment_type = models.CharField(max_length=50, blank=True, default='')  # e.g. image, file, document
    
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message from {self.sender.username} at {self.created_at}"
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
    
    @property
    def has_attachment(self):
        return bool(self.attachment)