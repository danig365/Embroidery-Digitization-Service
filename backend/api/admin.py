from django.contrib import admin
from .models import (
    UserProfile, TokenPackage, TokenTransaction, 
    Design, Order, Cart,
    EmailVerificationToken, PasswordResetToken,
    Conversation, Message
)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'tokens', 'email_verified', 'created_at']
    search_fields = ['user__username', 'user__email']
    list_filter = ['email_verified']

@admin.register(TokenPackage)
class TokenPackageAdmin(admin.ModelAdmin):
    list_display = ['name', 'tokens', 'price', 'price_per_token', 'savings_percentage', 'is_popular']
    list_editable = ['is_popular']

@admin.register(TokenTransaction)
class TokenTransactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'type', 'amount', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['user__username']

@admin.register(Design)
class DesignAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'status', 'tokens_used', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'name', 'prompt']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'design', 'status', 'email_sent', 'created_at']
    list_filter = ['status', 'email_sent', 'created_at']
    search_fields = ['order_number', 'user__username', 'design__name']
    readonly_fields = ['order_number', 'created_at', 'updated_at']
    fieldsets = (
        ('Order Information', {
            'fields': ('order_number', 'user', 'design', 'status', 'tokens_used')
        }),
        ('Output Files', {
            'fields': ('output_dst', 'output_pes', 'output_jef', 'output_exp', 'output_vp3', 'output_xxx'),
            'description': 'Upload completed embroidery files here after manual digitization'
        }),
        ('Notifications', {
            'fields': ('email_sent', 'notification_sent_at')
        }),
        ('Admin Notes', {
            'fields': ('admin_notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at')
        }),
    )

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'design', 'added_at']
    search_fields = ['user__username', 'design__name']

@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_used', 'expires_at', 'created_at']
    list_filter = ['is_used']
    search_fields = ['user__username', 'user__email']

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_used', 'expires_at', 'created_at']
    list_filter = ['is_used']
    search_fields = ['user__username', 'user__email']


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['order', 'customer', 'admin', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['customer__username', 'admin__username', 'order__order_number']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'conversation', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['sender__username', 'content', 'conversation__order__order_number']
    readonly_fields = ['created_at', 'read_at']
