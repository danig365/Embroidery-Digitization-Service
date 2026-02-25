from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    path("auth/google/", views.google_auth, name="google_auth"),
    path("auth/profile/", views.user_profile, name="user_profile"),
    path("auth/verify-email/", views.verify_email, name="verify_email"),
    path("auth/resend-verification/", views.resend_verification, name="resend_verification"),
    path("auth/forgot-password/", views.forgot_password, name="forgot_password"),
    path("auth/reset-password/", views.reset_password, name="reset_password"),
    path("auth/change-password/", views.change_password, name="change_password"),
    
    # User aliases (for frontend compatibility)
    path("users/profile/", views.user_profile, name="user_profile_alias"),
    path("users/profile/update/", views.user_profile, name="user_profile_update_alias"),
    path("users/change-password/", views.change_password, name="change_password_alias"),
    
    # Tokens
    path("tokens/balance/", views.token_balance, name="token_balance"),
    path("tokens/packages/", views.token_packages, name="token_packages"),
    path("tokens/transactions/", views.token_transactions, name="token_transactions"),
    path("tokens/costs/", views.get_token_costs, name="get_token_costs"),
    
    # Token Package Management (Staff Only)
    path("token-packages/", views.manage_token_packages, name="manage_token_packages"),
    path("token-packages/<int:package_id>/", views.manage_token_package_detail, name="manage_token_package_detail"),
    path("token-packages/<int:package_id>/popularity/", views.update_package_popularity, name="update_package_popularity"),
    path("token-packages/stats/", views.token_package_stats, name="token_package_stats"),
    
    # Design Management (NEW)
    path("designs/create/", views.create_design, name="create_design"),
    path("designs/generate-ai-image/", views.generate_ai_image, name="generate_ai_image"),
    path("designs/generate-embroidery-preview/", views.generate_embroidery_preview_new, name="generate_embroidery_preview_new"),
    path("designs/list/", views.list_designs, name="list_designs_alias"),
    path("designs/", views.list_designs, name="list_designs"),
    path("designs/<int:design_id>/", views.get_design, name="get_design"),
    path("designs/<int:design_id>/update/", views.update_design, name="update_design"),
    path("designs/<int:design_id>/delete/", views.delete_design, name="delete_design"),
    path("designs/<int:design_id>/generate-preview/", views.generate_preview, name="generate_preview"),
    
    # Cart Management (NEW)
    path("cart/", views.view_cart, name="view_cart"),
    path("cart/add/<int:design_id>/", views.add_to_cart, name="add_to_cart"),
    path("cart/<int:cart_item_id>/remove/", views.remove_cart_item, name="remove_cart_item"),
    path("cart/remove/<int:design_id>/", views.remove_from_cart, name="remove_from_cart"),
    path("cart/clear/", views.clear_cart, name="clear_cart"),
    path("cart/checkout/", views.cart_checkout, name="cart_checkout"),
    path("cart/validate/", views.validate_cart_before_checkout, name="validate_cart_before_checkout"),
    
    # Order Management (NEW)
    path("orders/create/", views.create_order, name="create_order"),
    path("orders/list/", views.list_orders, name="list_orders_alias"),
    path("orders/", views.list_orders, name="list_orders"),
    path("orders/<int:order_id>/", views.get_order, name="get_order"),
    path("orders/<int:order_id>/retry/", views.retry_order, name="retry_order"),
    path("orders/<int:order_id>/download/<str:format_type>/", views.download_order_file, name="download_order_file"),
    
    # Payment
    path("payment/create-checkout/", views.create_checkout_session, name="create_checkout"),
    path("payment/webhook/", views.stripe_webhook, name="stripe_webhook"),
    path("payment/verify/", views.verify_payment, name="verify_payment"),
    
    # Admin - Order Management
    path("admin/orders/", views.admin_list_orders, name="admin_list_orders"),
    path("admin/orders/<int:order_id>/", views.admin_get_order, name="admin_get_order"),
    path("admin/orders/<int:order_id>/upload-files/", views.admin_upload_files, name="admin_upload_files"),
    path("admin/orders/<int:order_id>/update-status/", views.admin_update_status, name="admin_update_status"),
    path("admin/orders/<int:order_id>/resources/", views.admin_order_resources, name="admin_order_resources"),
    path("admin/resources/<int:resource_id>/delete/", views.admin_delete_resource, name="admin_delete_resource"),
    path("resources/<int:resource_id>/download/", views.download_resource, name="download_resource"),
    
    # Design Features (Staff Management + Customer Usage)
    path("features/", views.manage_design_features, name="manage_design_features"),
    path("features/<int:feature_id>/", views.manage_design_feature_detail, name="manage_design_feature_detail"),
    path("features/available/", views.list_available_features, name="list_available_features"),
    path("designs/<int:design_id>/features/", views.get_design_features, name="get_design_features"),
    path("designs/features/add/", views.add_feature_to_design, name="add_feature_to_design"),
    path("designs/features/remove/", views.remove_feature_from_design, name="remove_feature_from_design"),
    path("features/stats/", views.feature_usage_stats, name="feature_usage_stats"),
    
    # Token Cost Management (Staff Only)
    path("admin/token-costs/", views.manage_token_costs, name="manage_token_costs"),
    path("admin/embroidery-size-pricing/", views.manage_embroidery_size_pricing, name="manage_embroidery_size_pricing"),
    path("admin/embroidery-size-pricing/<int:tier_id>/", views.manage_embroidery_size_pricing_detail, name="manage_embroidery_size_pricing_detail"),
    
    # Chat System
    path("chat/conversations/", views.conversation_list, name="conversation_list"),
    path("chat/conversations/<int:conversation_id>/", views.conversation_detail, name="conversation_detail"),
    path("chat/unread-count/", views.unread_messages_count, name="unread_messages_count"),
    
    # Health
    path("health/", views.health_check, name="health_check"),
]
