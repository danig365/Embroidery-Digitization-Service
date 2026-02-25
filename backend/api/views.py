from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import FileResponse
from django.conf import settings
from django.utils import timezone
import os
import uuid
import re
import stripe
import logging
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

logger = logging.getLogger(__name__)

from .models import (
    UserProfile,
    TokenPackage,
    TokenTransaction,
    Design,
    Order,
    Cart,
    DesignFeature,
    DesignFeatureUsage,
    EmailVerificationToken,
    PasswordResetToken,
    TokenCostSettings,
    OrderResource,
    Conversation,
    Message,
)
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    TokenPackageSerializer,
    TokenTransactionSerializer,
    DesignSerializer,
    OrderSerializer,
    CartSerializer,
    DesignFeatureSerializer,
    DesignFeatureUsageSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ConversationSerializer,
    ConversationListSerializer,
    MessageSerializer,
    OrderResourceSerializer,
)
from .utils.openai_service import OpenAIService

# Pattern storage removed - using database now

# ============================================================================
# AUTHENTICATION
# ============================================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """Register new user with email verification"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        return Response(
            {
                "success": True,
                "message": "Registration successful! Please check your email to verify your account.",
                "email": user.email,
                "username": user.username,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        {"success": False, "errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _generate_unique_username(email, full_name=""):
    base_source = (full_name or "").strip() or email.split("@")[0]
    base_username = re.sub(r"[^a-zA-Z0-9._-]", "", base_source.lower())
    base_username = base_username[:120] or "user"

    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        suffix = f"{counter}"
        username = f"{base_username[:max(1, 120 - len(suffix))]}{suffix}"
        counter += 1

    return username


@api_view(["POST"])
@permission_classes([AllowAny])
def google_auth(request):
    """Authenticate or register users using Google ID token"""
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        return Response(
            {"success": False, "error": "Google OAuth is not configured"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    google_token = request.data.get("id_token")
    if not google_token:
        return Response(
            {"success": False, "error": "Google ID token is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        token_info = google_id_token.verify_oauth2_token(
            google_token,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID,
        )
    except Exception:
        return Response(
            {"success": False, "error": "Invalid Google token"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    issuer = token_info.get("iss")
    if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
        return Response(
            {"success": False, "error": "Invalid Google token issuer"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    email = token_info.get("email")
    if not email:
        return Response(
            {"success": False, "error": "Google account email is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if token_info.get("email_verified") is False:
        return Response(
            {"success": False, "error": "Google email is not verified"},
            status=status.HTTP_403_FORBIDDEN,
        )

    given_name = token_info.get("given_name", "")
    family_name = token_info.get("family_name", "")
    full_name = token_info.get("name", "")

    user = User.objects.filter(email=email).first()
    is_new_user = False

    if not user:
        username = _generate_unique_username(email=email, full_name=full_name)
        user = User.objects.create_user(
            username=username,
            email=email,
            password=None,
            first_name=given_name,
            last_name=family_name,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        is_new_user = True
    else:
        updated_fields = []
        if not user.first_name and given_name:
            user.first_name = given_name
            updated_fields.append("first_name")
        if not user.last_name and family_name:
            user.last_name = family_name
            updated_fields.append("last_name")
        if updated_fields:
            user.save(update_fields=updated_fields)

    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={"email_verified": True, "tokens": 50},
    )

    profile_updated = []
    if not profile.email_verified:
        profile.email_verified = True
        profile_updated.append("email_verified")
    if is_new_user and profile.tokens < 50:
        profile.tokens = 50
        profile_updated.append("tokens")
    if profile_updated:
        profile.save(update_fields=profile_updated)

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "success": True,
            "user": UserSerializer(user).data,
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
        }
    )


# ============================================================================
# DESIGN MANAGEMENT
# ============================================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_design(request):
    """
    Create a new design - supports AI generation
    Costs dynamically configured tokens for AI generation
    """
    try:
        # Basic Design Details
        name = request.data.get("name", "Untitled Design")
        prompt = request.data.get("prompt")
        
        # Create design object
        design = Design.objects.create(
            user=request.user,
            name=name,
            prompt=prompt,
            status='draft'
        )
        
        # Handle AI generation (costs dynamically configured tokens)
        if prompt:
            profile = request.user.profile
            cost_settings = TokenCostSettings.get_costs()
            tokens_required = cost_settings.ai_image_generation
            
            if not profile.has_tokens(tokens_required):
                design.delete()  # Clean up
                return Response(
                    {
                        "error": "Insufficient tokens",
                        "required": tokens_required,
                        "available": profile.tokens,
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED,
                )
            
            # Generate dual images
            openai_service = OpenAIService()
            result = openai_service.generate_dual_images(prompt, style)
            
            if not result['success']:
                design.delete()  # Clean up
                return Response(
                    {"error": result['error']}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Save normal image
            normal_filename = f"normal_{uuid.uuid4()}.png"
            normal_path = os.path.join(settings.MEDIA_ROOT, "designs/normal", normal_filename)
            os.makedirs(os.path.dirname(normal_path), exist_ok=True)
            
            if result['normal_image'].get('b64_json'):
                openai_service.save_base64_image(result['normal_image']['b64_json'], normal_path)
            elif result['normal_image'].get('image_url'):
                openai_service.download_image(result['normal_image']['image_url'], normal_path)
            
            # Save embroidery preview
            embroidery_filename = f"embroidery_{uuid.uuid4()}.png"
            embroidery_path = os.path.join(settings.MEDIA_ROOT, "designs/embroidery", embroidery_filename)
            os.makedirs(os.path.dirname(embroidery_path), exist_ok=True)
            
            if result['embroidery_preview'].get('b64_json'):
                openai_service.save_base64_image(result['embroidery_preview']['b64_json'], embroidery_path)
            elif result['embroidery_preview'].get('image_url'):
                openai_service.download_image(result['embroidery_preview']['image_url'], embroidery_path)
            
            # Update design
            design.normal_image = f"designs/normal/{normal_filename}"
            design.embroidery_preview = f"designs/embroidery/{embroidery_filename}"
            design.tokens_used = tokens_required
            design.status = 'ready'
            design.save()
            
            # Add text overlay to normal image if text content provided
            if text_content.strip():
                try:
                    from .utils.image_processor import ImageProcessor
                    
                    processor = ImageProcessor()
                    img = processor.load_image(normal_path)
                    
                    # Add text overlay
                    img_with_text = processor.add_text_overlay(
                        img,
                        text_content=text_content,
                        text_font=text_font,
                        text_style=text_style,
                        text_size=int(text_size),
                        text_color=text_color,
                        text_outline_color=text_outline_color,
                        text_outline_thickness=int(text_outline_thickness),
                        text_position_x=int(text_position_x),
                        text_position_y=int(text_position_y)
                    )
                    
                    # Overwrite the normal image with text
                    img_with_text.save(normal_path, "PNG")
                    
                except Exception as e:
                    print(f"⚠️ Error adding text to AI image: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    # Continue without text overlay
            
            # Deduct tokens
            profile.deduct_tokens(tokens_required)
            
            # Create transaction
            TokenTransaction.objects.create(
                user=request.user,
                type="usage",
                amount=tokens_required,
                description=f"Generated design: {name}"
            )
            
            return Response({
                "success": True,
                "message": "Design created successfully",
                "design": DesignSerializer(design, context={'request': request}).data,
                "tokens_remaining": profile.tokens
            }, status=status.HTTP_201_CREATED)
        
        # No image or prompt provided
        return Response({
            "success": True,
            "message": "Design draft created",
            "design": DesignSerializer(design, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_ai_image(request):
    """
    Generate AI image using OpenAI DALL-E 3
    Costs dynamically configured tokens
    """
    try:
        design_id = request.data.get("design_id")
        prompt = request.data.get("prompt")
        machine_brand = request.data.get("machine_brand", "Brother")
        requested_format = request.data.get("requested_format", "pes")
        embroidery_size_cm = request.data.get("embroidery_size_cm", 10)
        
        if not prompt:
            return Response(
                {"error": "Prompt is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check tokens
        profile = request.user.profile
        cost_settings = TokenCostSettings.get_costs()
        tokens_required = cost_settings.ai_image_generation
        
        if not profile.has_tokens(tokens_required):
            return Response(
                {
                    "error": "Insufficient tokens",
                    "required": tokens_required,
                    "available": profile.tokens,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        
        # Get or create design
        if design_id:
            try:
                design = Design.objects.get(id=design_id, user=request.user)
            except Design.DoesNotExist:
                return Response(
                    {"error": "Design not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Create new design
            design = Design.objects.create(
                user=request.user,
                name=request.data.get("name", "AI Generated Design"),
                prompt=prompt,
                machine_brand=machine_brand,
                requested_format=requested_format,
                embroidery_size_cm=embroidery_size_cm,
                status='draft'
            )
        
        # Generate AI image (embroidery style directly)
        openai_service = OpenAIService()
        embroidery_prompt = f"{prompt}, embroidery style, textile art, stitched design, thread work"
        result = openai_service.generate_image(embroidery_prompt, quality="high")
        
        if not result['success']:
            if not design_id:
                design.delete()  # Clean up if new design
            return Response(
                {"error": result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Save embroidery preview (this is the only image generated)
        embroidery_filename = f"embroidery_{uuid.uuid4()}.png"
        embroidery_path = os.path.join(settings.MEDIA_ROOT, "designs/embroidery", embroidery_filename)
        os.makedirs(os.path.dirname(embroidery_path), exist_ok=True)
        
        if result.get('b64_json'):
            openai_service.save_base64_image(result['b64_json'], embroidery_path)
        elif result.get('image_url'):
            openai_service.download_image(result['image_url'], embroidery_path)
        
        # Update design with only embroidery preview and machine settings
        design.embroidery_preview = f"designs/embroidery/{embroidery_filename}"
        design.prompt = prompt
        design.machine_brand = machine_brand
        design.requested_format = requested_format
        design.embroidery_size_cm = embroidery_size_cm
        design.tokens_used += tokens_required
        design.save()
        
        # Deduct tokens
        profile.deduct_tokens(tokens_required)
        
        # Create transaction
        TokenTransaction.objects.create(
            user=request.user,
            type="usage",
            amount=tokens_required,
            description=f"Generated AI image for: {design.name}"
        )
        
        return Response({
            "success": True,
            "message": "AI image generated successfully",
            "design": DesignSerializer(design).data,
            "tokens_remaining": profile.tokens
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_embroidery_preview_new(request):
    """
    Generate embroidery preview using OpenAI DALL-E 3
    Works for BOTH AI-generated images (uses prompt) AND uploaded images (uses image)
    Costs dynamically configured tokens (separate from AI image generation)
    """
    try:
        design_id = request.data.get("design_id")
        
        if not design_id:
            return Response(
                {"error": "Design ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            design = Design.objects.get(id=design_id, user=request.user)
        except Design.DoesNotExist:
            return Response(
                {"error": "Design not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if prompt (AI) exists
        if not design.prompt:
            return Response(
                {"error": "Design must have an AI prompt"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate embroidery preview (FREE - no token cost)
        openai_service = OpenAIService()
        size = request.data.get("size", "1024x1024")
        
        # Use prompt to generate embroidery style
        embroidery_prompt = f"{design.prompt}, embroidery style, textile art, stitched design, thread work"
        result = openai_service.generate_image(embroidery_prompt, size=size, quality="high")
        
        if not result['success']:
            return Response(
                {"error": result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Save embroidery preview
        embroidery_filename = f"embroidery_{uuid.uuid4()}.png"
        embroidery_path = os.path.join(settings.MEDIA_ROOT, "designs/embroidery", embroidery_filename)
        os.makedirs(os.path.dirname(embroidery_path), exist_ok=True)
        
        print(f"\n💾 SAVING EMBROIDERY PREVIEW...")
        if result.get('b64_json'):
            # OpenAI result - base64 encoded
            print(f"   Saving from OpenAI (base64)...")
            openai_service.save_base64_image(result['b64_json'], embroidery_path)
        elif result.get('image_url'):
            # OpenAI result - URL
            print(f"   Saving from OpenAI (URL)...")
            openai_service.download_image(result['image_url'], embroidery_path)
        elif result.get('local_image'):
            # Local processed image
            print(f"   Saving local processed image...")
            local_img = result['local_image']
            local_img.save(embroidery_path, 'PNG')
            print(f"   ✅ Local image saved")
        
        print(f"   ✅ Embroidery preview saved to: designs/embroidery/{embroidery_filename}")
        
        # Update design - mark as ready once preview is generated
        design.embroidery_preview = f"designs/embroidery/{embroidery_filename}"
        design.status = 'ready'  # Mark as ready when preview is generated
        design.save()
        
        # Note: Embroidery preview is FREE - no token deduction
        
        return Response({
            "success": True,
            "message": "Embroidery preview generated successfully",
            "design": DesignSerializer(design).data,
            "tokens_remaining": profile.tokens
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_designs(request):
    """List all user's designs"""
    designs = Design.objects.filter(user=request.user).order_by('-created_at')
    serializer = DesignSerializer(designs, many=True, context={'request': request})
    return Response({
        "success": True,
        "designs": serializer.data
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_design(request, design_id):
    """Get single design details"""
    try:
        design = Design.objects.get(id=design_id, user=request.user)
        return Response(DesignSerializer(design).data)
    except Design.DoesNotExist:
        return Response(
            {"error": "Design not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_design(request, design_id):
    """Update design settings"""
    try:
        design = Design.objects.get(id=design_id, user=request.user)
        
        # Update fields
        if 'name' in request.data:
            design.name = request.data['name']
        
        # Embroidery Size (for pricing)
        if 'embroidery_size_cm' in request.data:
            design.embroidery_size_cm = int(request.data['embroidery_size_cm'])
        
        # Machine Settings
        if 'machine_brand' in request.data:
            design.machine_brand = request.data['machine_brand']
        if 'requested_format' in request.data:
            design.requested_format = request.data['requested_format']
        
        # If design has embroidery preview, set status to 'ready'
        if design.embroidery_preview and design.status == 'draft':
            design.status = 'ready'
        
        design.save()
        
        return Response({
            "success": True,
            "message": "Design updated",
            "design": DesignSerializer(design).data
        })
        
    except Design.DoesNotExist:
        return Response(
            {"error": "Design not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_design(request, design_id):
    """Delete a design"""
    try:
        design = Design.objects.get(id=design_id, user=request.user)
        design.delete()
        return Response({
            "success": True,
            "message": "Design deleted"
        })
    except Design.DoesNotExist:
        return Response(
            {"error": "Design not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_preview(request, design_id):
    """
    Regenerate embroidery preview for existing design
    Costs 2 tokens
    """
    try:
        design = Design.objects.get(id=design_id, user=request.user)
        
        if not design.prompt:
            return Response(
                {"error": "Design has no prompt to regenerate from"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate new preview (FREE - no token cost)
        openai_service = OpenAIService()
        result = openai_service.generate_dual_images(design.prompt, design.style or "")
        
        if not result['success']:
            return Response(
                {"error": result['error']}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Save new images (replace old ones)
        normal_filename = f"normal_{uuid.uuid4()}.png"
        normal_path = os.path.join(settings.MEDIA_ROOT, "designs/normal", normal_filename)
        os.makedirs(os.path.dirname(normal_path), exist_ok=True)
        
        if result['normal_image'].get('b64_json'):
            openai_service.save_base64_image(result['normal_image']['b64_json'], normal_path)
        elif result['normal_image'].get('image_url'):
            openai_service.download_image(result['normal_image']['image_url'], normal_path)
        
        embroidery_filename = f"embroidery_{uuid.uuid4()}.png"
        embroidery_path = os.path.join(settings.MEDIA_ROOT, "designs/embroidery", embroidery_filename)
        os.makedirs(os.path.dirname(embroidery_path), exist_ok=True)
        
        if result['embroidery_preview'].get('b64_json'):
            openai_service.save_base64_image(result['embroidery_preview']['b64_json'], embroidery_path)
        elif result['embroidery_preview'].get('image_url'):
            openai_service.download_image(result['embroidery_preview']['image_url'], embroidery_path)
        
        # Update design
        design.normal_image = f"designs/normal/{normal_filename}"
        design.embroidery_preview = f"designs/embroidery/{embroidery_filename}"
        design.save()
        
        # Note: Embroidery preview regeneration is FREE - no token deduction
        
        return Response({
            "success": True,
            "message": "Preview regenerated",
            "design": DesignSerializer(design).data,
            "tokens_remaining": profile.tokens
        })
        
    except Design.DoesNotExist:
        return Response(
            {"error": "Design not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


# ============================================================================
# CART MANAGEMENT
# ============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_cart(request):
    """View cart contents"""
    cart_items = Cart.objects.filter(user=request.user)
    serializer = CartSerializer(cart_items, many=True, context={'request': request})
    return Response({
        "success": True,
        "cart_items": serializer.data,
        "count": cart_items.count()
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_to_cart(request, design_id):
    """Add design to cart"""
    try:
        design = Design.objects.get(id=design_id, user=request.user)
        
        # Check if design is ready
        if design.status == 'draft':
            return Response(
                {"error": "Cannot add draft design to cart. Generate preview first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add to cart (or get existing)
        cart_item, created = Cart.objects.get_or_create(
            user=request.user,
            design=design
        )
        
        message = "Design added to cart" if created else "Design already in cart"
        
        return Response({
            "success": True,
            "message": message,
            "cart_item": CartSerializer(cart_item).data
        })
        
    except Design.DoesNotExist:
        return Response(
            {"error": "Design not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, design_id):
    """Remove design from cart by design ID"""
    try:
        cart_item = Cart.objects.get(user=request.user, design_id=design_id)
        cart_item.delete()
        return Response({
            "success": True,
            "message": "Design removed from cart"
        })
    except Cart.DoesNotExist:
        return Response(
            {"error": "Cart item not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_cart_item(request, cart_item_id):
    """Remove cart item by cart item ID"""
    try:
        cart_item = Cart.objects.get(user=request.user, id=cart_item_id)
        cart_item.delete()
        return Response({
            "success": True,
            "message": "Item removed from cart"
        })
    except Cart.DoesNotExist:
        return Response(
            {"success": False, "error": "Cart item not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def clear_cart(request):
    """Clear entire cart"""
    Cart.objects.filter(user=request.user).delete()
    return Response({
        "success": True,
        "message": "Cart cleared"
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cart_checkout(request):
    """
    Checkout cart - submit all cart items as orders
    Deducts tokens based on size-based pricing, creates orders, clears cart
    """
    try:
        # Get requested file formats from request
        requested_formats = request.data.get('requested_formats', ['dst', 'pes', 'jef'])
        
        # Validate formats - All 22 supported embroidery formats
        valid_formats = [
            # Industrial
            'dst', 'dsb', 'dsz', 'exp', 'tbf', 'fdr', 'stx',
            # Domestic
            'pes', 'pec', 'jef', 'sew', 'hus', 'vip', 'vp3', 'xxx',
            # Commercial
            'cmd', 'tap', 'tim', 'emt', '10o', 'ds9'
        ]
        requested_formats = [f.lower() for f in requested_formats if f.lower() in valid_formats]
        
        if not requested_formats:
            return Response(
                {"success": False, "error": "At least one file format must be selected"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get cart items
        cart_items = Cart.objects.filter(user=request.user).select_related('design')
        if not cart_items.exists():
            return Response(
                {"success": False, "error": "Cart is empty"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate all designs still exist and are ready
        invalid_items = []
        designs_to_order = []
        
        for item in cart_items:
            # Check if design exists
            if not item.design:
                invalid_items.append({
                    "item_id": item.id,
                    "reason": "Design no longer exists"
                })
                continue
            
            # Check if design is in valid state (draft or ready)
            if item.design.status not in ['ready', 'draft']:
                invalid_items.append({
                    "item_id": item.id,
                    "design_id": item.design.id,
                    "reason": f"Design status is '{item.design.status}', only 'ready' or 'draft' designs can be ordered"
                })
                continue
            
            designs_to_order.append({
                'design': item.design,
                'size_cm': item.design.embroidery_size_cm  # Use design's configured size
            })
        
        # Remove invalid items from cart
        if invalid_items:
            invalid_item_ids = [item["item_id"] for item in invalid_items]
            Cart.objects.filter(id__in=invalid_item_ids).delete()
            
            # If all items were invalid
            if not designs_to_order:
                return Response(
                    {
                        "success": False,
                        "error": "No valid designs in cart",
                        "invalid_items": invalid_items
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Calculate total tokens required based on size pricing
        from .models import EmbroiderySizePricing
        
        profile = request.user.profile
        total_tokens_required = 0
        order_costs = []
        
        for item in designs_to_order:
            # Get price for this size
            size_price = EmbroiderySizePricing.get_price_for_size(item['size_cm'])
            total_tokens_required += size_price
            order_costs.append({
                'design': item['design'],
                'size_cm': item['size_cm'],
                'tokens_cost': size_price
            })
        
        if not profile.has_tokens(total_tokens_required):
            return Response(
                {
                    "success": False,
                    "error": "Insufficient tokens",
                    "required": total_tokens_required,
                    "available": profile.tokens,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        
        # Create orders with size-based costs
        created_orders = []
        for item in order_costs:
            order = Order.objects.create(
                user=request.user,
                design=item['design'],
                status='submitted',
                tokens_used=item['tokens_cost'],
                embroidery_size_cm=item['size_cm'],
                requested_formats=requested_formats
            )
            created_orders.append(order)
            
            # Update design status
            item['design'].status = 'processing'
            item['design'].save()
        
        # Deduct tokens
        profile.deduct_tokens(total_tokens_required)
        
        # Create transaction
        TokenTransaction.objects.create(
            user=request.user,
            type="usage",
            amount=-total_tokens_required,
            description=f"Submitted {len(created_orders)} order(s) for digitization"
        )
        
        # Clear cart
        Cart.objects.filter(user=request.user).delete()
        
        # Send email notification (async in production)
        for order in created_orders:
            try:
                send_order_submitted_email(order)
            except:
                pass  # Don't fail order creation if email fails
        
        response_data = {
            "success": True,
            "message": f"{len(created_orders)} order(s) submitted successfully",
            "orders": OrderSerializer(created_orders, many=True).data,
            "tokens_remaining": profile.tokens
        }
        
        # Add warning about invalid items if any were removed
        if invalid_items:
            response_data["warnings"] = {
                "removed_items": len(invalid_items),
                "reason": "Some items were removed due to invalid design state",
                "invalid_items": invalid_items
            }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"success": False, "error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ============================================================================
# ORDER MANAGEMENT
# ============================================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_order(request):
    """
    Submit order for manual digitization
    Can submit single design or entire cart
    Uses size-based pricing (from design's embroidery_size_cm)
    """
    try:
        design_id = request.data.get("design_id")
        from_cart = request.data.get("from_cart", False)
        
        # Get requested file formats from request
        requested_formats = request.data.get('requested_formats', ['dst', 'pes', 'jef'])
        
        # Validate formats - All 22 supported embroidery formats
        valid_formats = [
            # Industrial
            'dst', 'dsb', 'dsz', 'exp', 'tbf', 'fdr', 'stx',
            # Domestic
            'pes', 'pec', 'jef', 'sew', 'hus', 'vip', 'vp3', 'xxx',
            # Commercial
            'cmd', 'tap', 'tim', 'emt', '10o', 'ds9'
        ]
        requested_formats = [f.lower() for f in requested_formats if f.lower() in valid_formats]
        
        if not requested_formats:
            requested_formats = ['dst', 'pes', 'jef']  # Default if none provided
        
        items_to_order = []
        
        if design_id:
            # Single design order
            try:
                design = Design.objects.get(id=design_id, user=request.user)
                items_to_order = [{
                    'design': design,
                    'size_cm': design.embroidery_size_cm  # Use design's configured size
                }]
            except Design.DoesNotExist:
                return Response(
                    {"error": "Design not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        elif from_cart:
            # Order from cart
            cart_items = Cart.objects.filter(user=request.user)
            if not cart_items.exists():
                return Response(
                    {"error": "Cart is empty"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            items_to_order = [{
                'design': item.design,
                'size_cm': item.design.embroidery_size_cm  # Use design's configured size
            } for item in cart_items]
        else:
            return Response(
                {"error": "Must provide design_id or set from_cart=true"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate total tokens required based on size pricing
        from .models import EmbroiderySizePricing
        
        profile = request.user.profile
        total_tokens_required = 0
        order_costs = []
        
        for item in items_to_order:
            # Get price for this size
            size_price = EmbroiderySizePricing.get_price_for_size(item['size_cm'])
            total_tokens_required += size_price
            order_costs.append({
                'design': item['design'],
                'size_cm': item['size_cm'],
                'tokens_cost': size_price
            })
        
        if not profile.has_tokens(total_tokens_required):
            return Response(
                {
                    "error": "Insufficient tokens",
                    "required": total_tokens_required,
                    "available": profile.tokens,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        
        # Create orders with size-based costs
        created_orders = []
        for item in order_costs:
            order = Order.objects.create(
                user=request.user,
                design=item['design'],
                status='submitted',
                tokens_used=item['tokens_cost'],
                embroidery_size_cm=item['size_cm'],
                requested_formats=requested_formats
            )
            created_orders.append(order)
            
            # Update design status
            item['design'].status = 'processing'
            item['design'].save()
        
        # Deduct tokens
        profile.deduct_tokens(total_tokens_required)
        
        # Create transaction
        TokenTransaction.objects.create(
            user=request.user,
            type="usage",
            amount=total_tokens_required,
            description=f"Submitted {len(created_orders)} order(s) for digitization"
        )
        
        # Clear cart if ordering from cart
        if from_cart:
            Cart.objects.filter(user=request.user).delete()
        
        # Send email notification (async in production)
        for order in created_orders:
            try:
                send_order_submitted_email(order)
            except:
                pass  # Don't fail order creation if email fails
        
        return Response({
            "success": True,
            "message": f"{len(created_orders)} order(s) submitted successfully",
            "orders": OrderSerializer(created_orders, many=True).data,
            "tokens_remaining": profile.tokens
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_orders(request):
    """List all user's orders"""
    status_filter = request.query_params.get("status")
    
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    
    if status_filter:
        orders = orders.filter(status=status_filter)
    
    serializer = OrderSerializer(orders, many=True, context={'request': request})
    return Response({
        "success": True,
        "orders": serializer.data
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_order(request, order_id):
    """Get single order details"""
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        return Response({
            "success": True,
            "order": OrderSerializer(order, context={'request': request}).data
        })
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def retry_order(request, order_id):
    """Retry a failed order"""
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        
        if order.status != 'failed':
            return Response(
                {"error": "Can only retry failed orders"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'submitted'
        order.save()
        
        # Send notification
        try:
            send_order_submitted_email(order)
        except:
            pass
        
        return Response({
            "success": True,
            "message": "Order resubmitted",
            "order": OrderSerializer(order).data
        })
        
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_order_file(request, order_id, format_type):
    """Download completed embroidery file"""
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        
        if order.status != 'completed':
            return Response(
                {"error": "Order not completed yet"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the file field for requested format
        format_field_map = {
            # Industrial
            'dst': order.output_dst,
            'dsb': order.output_dsb,
            'dsz': order.output_dsz,
            'exp': order.output_exp,
            'tbf': order.output_tbf,
            'fdr': order.output_fdr,
            'stx': order.output_stx,
            # Domestic
            'pes': order.output_pes,
            'pec': order.output_pec,
            'jef': order.output_jef,
            'sew': order.output_sew,
            'hus': order.output_hus,
            'vip': order.output_vip,
            'vp3': order.output_vp3,
            'xxx': order.output_xxx,
            # Commercial
            'cmd': order.output_cmd,
            'tap': order.output_tap,
            'tim': order.output_tim,
            'emt': order.output_emt,
            '10o': order.output_10o,
            'ds9': order.output_ds9,
        }
        
        file_field = format_field_map.get(format_type.lower())
        
        if not file_field:
            return Response(
                {"error": f"Format {format_type} not available"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        filename = f"{order.order_number}_{order.design.name}.{format_type.lower()}"
        
        return FileResponse(
            file_field.open('rb'),
            as_attachment=True,
            filename=filename
        )
        
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


def send_order_submitted_email(order):
    """Send email notification when order is submitted"""
    from django.core.mail import send_mail
    
    try:
        subject = f"Order Submitted - {order.order_number}"
        message = f"""
Hello {order.user.username},

Your embroidery digitization order has been submitted successfully!

Order Number: {order.order_number}
Design: {order.design.name}
Status: {order.get_status_display()}

We'll notify you when your order is complete and ready for download.

Best regards,
Embroidery AI Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [order.user.email],
            fail_silently=False,  # Raise exceptions to catch errors
        )
        
        order.email_sent = True
        order.notification_sent_at = timezone.now()
        order.save()
        logger.info(f"✅ Order submitted email sent to {order.user.email} (Order #{order.order_number})")
    except Exception as e:
        logger.error(f"❌ Failed to send order submitted email: {str(e)}")
        raise  # Re-raise to propagate error


# ============================================================================
# OLD ENDPOINTS (KEPT FOR COMPATIBILITY - CAN BE REMOVED)
# ============================================================================
    """Register new user with email verification"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        return Response(
            {
                "success": True,
                "message": "Registration successful! Please check your email to verify your account.",
                "email": user.email,
                "username": user.username,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        {"success": False, "errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_email(request):
    """Verify email using token"""
    token_string = request.data.get("token")

    if not token_string:
        return Response(
            {"success": False, "error": "Token is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        token = EmailVerificationToken.objects.get(token=token_string, is_used=False)

        if token.is_expired():
            return Response(
                {
                    "success": False,
                    "error": "Verification link has expired. Please request a new one.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify email and give welcome bonus
        user = token.user
        profile = user.profile
        profile.email_verified = True
        profile.tokens = 50  # Welcome bonus
        profile.save()

        # Mark token as used
        token.is_used = True
        token.save()

        # Create transaction record
        TokenTransaction.objects.create(
            user=user,
            type="welcome_bonus",
            amount=50,
            description="Welcome bonus for email verification",
        )

        # Generate JWT tokens for automatic login
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "success": True,
                "message": "Email verified successfully! You received 50 free tokens.",
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            }
        )

    except EmailVerificationToken.DoesNotExist:
        return Response(
            {"success": False, "error": "Invalid or already used verification token"},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def resend_verification(request):
    """Resend verification email"""
    email = request.data.get("email")

    if not email:
        return Response(
            {"success": False, "error": "Email is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(email=email)

        if user.profile.email_verified:
            return Response(
                {"success": False, "error": "Email is already verified"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Invalidate old tokens
        EmailVerificationToken.objects.filter(user=user, is_used=False).update(
            is_used=True
        )

        # Create and send new token
        verification_token = EmailVerificationToken.objects.create(user=user)
        verification_token.send_verification_email()

        return Response(
            {"success": True, "message": "Verification email sent successfully!"}
        )

    except User.DoesNotExist:
        return Response(
            {"success": False, "error": "No account found with this email"},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """Login user with username or email"""
    username_or_email = request.data.get("username")
    password = request.data.get("password")

    # Try to find user by email first, then by username
    user = None
    if "@" in username_or_email:
        # It's an email
        try:
            user_obj = User.objects.get(email=username_or_email)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass
    else:
        # It's a username
        user = authenticate(username=username_or_email, password=password)

    if user:
        # Check if profile exists and email is verified
        try:
            if not user.profile.email_verified:
                return Response(
                    {
                        "success": False,
                        "error": "Please verify your email before logging in",
                        "email_not_verified": True,
                        "email": user.email,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        except:
            # Profile doesn't exist, create one
            from api.models import UserProfile
            UserProfile.objects.get_or_create(
                user=user,
                defaults={'email_verified': True, 'tokens': 50}
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "success": True,
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            }
        )

    return Response(
        {"success": False, "error": "Invalid email/username or password"},
        status=status.HTTP_401_UNAUTHORIZED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    """Send password reset email"""
    serializer = ForgotPasswordSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = serializer.validated_data["email"]

    try:
        user = User.objects.get(email=email)

        # Invalidate old tokens
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

        # Create and send new token
        reset_token = PasswordResetToken.objects.create(user=user)
        reset_token.send_reset_email()

        return Response(
            {"success": True, "message": "Password reset email sent successfully!"}
        )

    except User.DoesNotExist:
        # Don't reveal if email exists or not for security
        return Response(
            {
                "success": True,
                "message": "If an account exists with this email, you will receive a password reset link.",
            }
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password using token"""
    serializer = ResetPasswordSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token_string = serializer.validated_data["token"]
    new_password = serializer.validated_data["new_password"]

    try:
        token = PasswordResetToken.objects.get(token=token_string, is_used=False)

        if token.is_expired():
            return Response(
                {
                    "success": False,
                    "error": "Reset link has expired. Please request a new one.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reset password
        user = token.user
        user.set_password(new_password)
        user.save()

        # Mark token as used
        token.is_used = True
        token.save()

        return Response(
            {
                "success": True,
                "message": "Password reset successfully! You can now login with your new password.",
            }
        )

    except PasswordResetToken.DoesNotExist:
        return Response(
            {"success": False, "error": "Invalid or already used reset token"},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change password for logged in user"""
    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")

    if not current_password or not new_password:
        return Response(
            {"success": False, "error": "Both current and new password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(new_password) < 8:
        return Response(
            {
                "success": False,
                "error": "New password must be at least 8 characters long",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user

    if not user.check_password(current_password):
        return Response(
            {"success": False, "error": "Current password is incorrect"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(new_password)
    user.save()

    return Response({"success": True, "message": "Password changed successfully!"})


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get or update user profile"""
    if request.method == "GET":
        # Get user statistics
        total_designs = Design.objects.filter(user=request.user).count()
        total_orders = Order.objects.filter(user=request.user).count()
        
        # Use UserSerializer to get all user data including is_staff and is_superuser
        user_serializer = UserSerializer(request.user)
        user_data = user_serializer.data
        
        # Add admin flags explicitly
        user_data["is_staff"] = request.user.is_staff
        user_data["is_superuser"] = request.user.is_superuser
        user_data["date_joined"] = request.user.date_joined.isoformat() if request.user.date_joined else None
        
        stats = {
            "total_designs": total_designs,
            "total_orders": total_orders,
        }
        
        return Response({
            "success": True,
            "user": user_data,
            "stats": stats,
            "profile": user_data  # For backward compatibility
        })
    
    elif request.method == "PUT":
        # Update user profile
        user = request.user
        user.first_name = request.data.get("first_name", user.first_name)
        user.last_name = request.data.get("last_name", user.last_name)
        user.email = request.data.get("email", user.email)
        user.save()
        
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "tokens": user.profile.tokens if hasattr(user, 'profile') else 0,
            "email_verified": user.profile.email_verified if hasattr(user, 'profile') else False,
        }
        return Response({"success": True, "user": user_data, "message": "Profile updated successfully"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def token_balance(request):
    profile = request.user.profile
    return Response(
        {
            "tokens": profile.tokens,
            "transactions": TokenTransactionSerializer(
                request.user.transactions.all().order_by("-created_at")[:10], many=True
            ).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def token_transactions(request):
    """Get user's token transaction history"""
    transactions = TokenTransaction.objects.filter(user=request.user).order_by("-created_at")
    
    # Get balance_after for each transaction
    transactions_data = []
    for transaction in transactions:
        transaction_dict = TokenTransactionSerializer(transaction).data
        # Calculate balance after this transaction (this is simplified - in production you'd store this)
        transaction_dict['balance_after'] = request.user.profile.tokens
        transactions_data.append(transaction_dict)
    
    return Response({
        "success": True,
        "transactions": transactions_data
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def token_packages(request):
    packages = TokenPackage.objects.all()
    return Response(TokenPackageSerializer(packages, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_token_costs(request):
    """Public endpoint to get current token costs (no auth required)"""
    costs = TokenCostSettings.get_costs()
    return Response({
        "success": True,
        "costs": {
            "ai_image_generation": costs.ai_image_generation,
            "order_placement": costs.order_placement,
        }
    })


# ============================================================================
# TOKEN PACKAGE MANAGEMENT (STAFF ONLY)
# ============================================================================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def manage_token_packages(request):
    """
    GET: List all token packages (staff only)
    POST: Create new token package (staff only)
    """
    if not (request.user.is_staff or request.user.is_superuser):
        return Response(
            {"error": "Staff access required"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if request.method == "GET":
        packages = TokenPackage.objects.all()
        serializer = TokenPackageSerializer(packages, many=True)
        return Response({
            "success": True,
            "packages": serializer.data
        })
    
    elif request.method == "POST":
        serializer = TokenPackageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Token package created",
                "package": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def manage_token_package_detail(request, package_id):
    """
    GET: Get token package details (staff only)
    PUT: Update token package (staff only)
    DELETE: Delete token package (staff only)
    """
    if not (request.user.is_staff or request.user.is_superuser):
        return Response(
            {"error": "Staff access required"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        package = TokenPackage.objects.get(id=package_id)
    except TokenPackage.DoesNotExist:
        return Response(
            {"error": "Token package not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == "GET":
        serializer = TokenPackageSerializer(package)
        return Response({
            "success": True,
            "package": serializer.data
        })
    
    elif request.method == "PUT":
        serializer = TokenPackageSerializer(package, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Token package updated",
                "package": serializer.data
            })
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        package_name = package.name
        package.delete()
        return Response({
            "success": True,
            "message": f"Token package '{package_name}' deleted"
        })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_package_popularity(request, package_id):
    """Mark a token package as popular/unpopular (staff only)"""
    if not (request.user.is_staff or request.user.is_superuser):
        return Response(
            {"error": "Staff access required"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        package = TokenPackage.objects.get(id=package_id)
    except TokenPackage.DoesNotExist:
        return Response(
            {"error": "Token package not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    is_popular = request.data.get("is_popular", False)
    
    # Only allow one popular package
    if is_popular:
        TokenPackage.objects.exclude(id=package_id).update(is_popular=False)
    
    package.is_popular = is_popular
    package.save()
    
    return Response({
        "success": True,
        "message": f"Package {'marked as' if is_popular else 'unmarked from'} popular",
        "package": TokenPackageSerializer(package).data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def token_package_stats(request):
    """Get token package statistics (staff only)"""
    if not (request.user.is_staff or request.user.is_superuser):
        return Response(
            {"error": "Staff access required"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    from django.db.models import Sum, Count
    
    stats = TokenTransaction.objects.filter(type="purchase").aggregate(
        total_tokens_sold=Sum('amount'),
        total_purchases=Count('id'),
        total_revenue=Sum('user__profile__tokens')
    )
    
    packages_data = []
    for package in TokenPackage.objects.all():
        purchases = TokenTransaction.objects.filter(
            type="purchase",
            description__contains=package.name
        ).count()
        
        packages_data.append({
            "id": package.id,
            "name": package.name,
            "tokens": package.tokens,
            "price": str(package.price),
            "purchases": purchases,
            "revenue": float(package.price) * purchases if purchases > 0 else 0
        })
    
    return Response({
        "success": True,
        "stats": stats,
        "packages": packages_data
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def validate_cart_before_checkout(request):
    """
    Validate cart items before checkout
    Checks if designs still exist and are valid
    (staff only for debugging)
    """
    user = request.user
    cart_items = Cart.objects.filter(user=user).select_related('design')
    
    validation_results = []
    invalid_items = []
    
    for item in cart_items:
        if not item.design:
            invalid_items.append(item.id)
            validation_results.append({
                "item_id": item.id,
                "valid": False,
                "reason": "Design not found"
            })
        elif item.design.status not in ['ready', 'draft']:
            invalid_items.append(item.id)
            validation_results.append({
                "item_id": item.id,
                "design_id": item.design.id,
                "valid": False,
                "reason": f"Design status is {item.design.status}"
            })
        else:
            validation_results.append({
                "item_id": item.id,
                "design_id": item.design.id,
                "valid": True,
                "design_name": item.design.name
            })
    
    # Remove invalid items
    if invalid_items:
        Cart.objects.filter(id__in=invalid_items).delete()
    
    return Response({
        "success": True,
        "total_items": cart_items.count(),
        "valid_items": len(validation_results) - len(invalid_items),
        "invalid_items": len(invalid_items),
        "validation_results": validation_results
    })

    package_id = request.data.get("package_id")

    try:
        package = TokenPackage.objects.get(id=package_id)
        profile = request.user.profile

        # In production, integrate with payment gateway here
        # For now, just add tokens
        profile.tokens += package.tokens
        profile.save()

        TokenTransaction.objects.create(
            user=request.user,
            type="purchase",
            amount=package.tokens,
            description=f"Purchased {package.name}",
        )

        return Response(
            {
                "success": True,
                "tokens": profile.tokens,
                "message": f"Successfully purchased {package.tokens} tokens",
            }
        )
    except TokenPackage.DoesNotExist:
        return Response(
            {"error": "Package not found"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_ai_image(request):
    prompt = request.data.get("prompt")

    if not prompt:
        return Response(
            {"error": "Prompt is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    profile = request.user.profile
    cost_settings = TokenCostSettings.get_costs()
    tokens_required = cost_settings.ai_image_generation

    if not profile.has_tokens(tokens_required):
        return Response(
            {
                "error": "Insufficient tokens",
                "required": tokens_required,
                "available": profile.tokens,
            },
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )

    # Generate BOTH images with OpenAI (normal + embroidery preview)
    openai_service = OpenAIService()

    # Generate dual images (normal and embroidery preview)
    result = openai_service.generate_dual_images(
        prompt, size="1024x1024", quality="high"
    )

    if not result["success"]:
        return Response(
            {"error": result["error"]}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Save both images
    normal_filename = f"{uuid.uuid4()}.png"
    embroidery_filename = f"{uuid.uuid4()}.png"
    normal_path = os.path.join(settings.MEDIA_ROOT, "generated", normal_filename)
    embroidery_path = os.path.join(settings.MEDIA_ROOT, "generated", embroidery_filename)

    # Save normal image
    normal_save_success = False
    normal_result = result["normal_image"]
    if normal_result.get("b64_json"):
        normal_save_success = openai_service.save_base64_image(normal_result["b64_json"], normal_path)
    elif normal_result.get("image_url"):
        normal_save_success = openai_service.download_image(normal_result["image_url"], normal_path)

    # Save embroidery preview image
    embroidery_save_success = False
    embroidery_result = result["embroidery_preview"]
    if embroidery_result.get("b64_json"):
        embroidery_save_success = openai_service.save_base64_image(embroidery_result["b64_json"], embroidery_path)
    elif embroidery_result.get("image_url"):
        embroidery_save_success = openai_service.download_image(embroidery_result["image_url"], embroidery_path)

    if normal_save_success and embroidery_save_success:
        # Deduct tokens
        profile.deduct_tokens(tokens_required)

        # Create Design object with BOTH images
        design = Design.objects.create(
            user=request.user,
            name=f"AI Generated: {prompt[:50]}",
            normal_image=f"generated/{normal_filename}",
            embroidery_preview=f"generated/{embroidery_filename}",
            prompt=prompt,
            status='ready',  # Set to 'ready' since we have both images
            tokens_used=tokens_required
        )

        # Create token transaction
        TokenTransaction.objects.create(
            user=request.user,
            type="usage",
            amount=tokens_required,
            description=f"Generated AI image with embroidery preview",
        )

        return Response(
            {
                "success": True,
                "design": DesignSerializer(design).data,
                "tokens_remaining": profile.tokens,
                "message": "Generated both normal and embroidery preview images"
            }
        )

    return Response(
        {"error": "Failed to save images"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )

    return Response(
        {"error": "Failed to save image"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


# ============================================================================
# OLD/DEPRECATED ENDPOINTS - NOT USED IN MANUAL DIGITIZATION WORKFLOW
# These are kept for backward compatibility but should NOT be used
# The actual workflow is: AI image generation -> Order submission -> Admin manual digitization
# ============================================================================

# @api_view(["POST"])
# @permission_classes([IsAuthenticated])
# def convert_to_embroidery(request):
#     """
#     DEPRECATED: This endpoint performs automatic conversion
#     NOT USED in manual digitization workflow
#     Keep commented out to prevent confusion
#     """
#     pass


@api_view(["GET"])
@permission_classes([AllowAny])
def supported_formats(request):
    """Return list of supported embroidery formats"""
    formats_dict = {
        'dst': 'Tajima',
        'pes': 'Brother',
        'jef': 'Janome',
        'exp': 'Melco',
        'vp3': 'Husqvarna Viking',
        'xxx': 'Singer'
    }
    
    formats_list = [{"code": code, "name": name} for code, name in formats_dict.items()]
    return Response({"success": True, "formats": formats_list})


# @api_view(["GET"])
# @permission_classes([IsAuthenticated])
# def download_embroidery(request, pattern_id, format_type):
#     """
#     DEPRECATED: This was for automatic conversion downloads
#     Use download_order_file instead for manual digitization workflow
#     """
#     pass



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_designs(request):
    designs = EmbroideryDesign.objects.filter(user=request.user).order_by("-created_at")
    return Response(EmbroideryDesignSerializer(designs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "healthy"})


# Add these imports at the top of views.py


# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Add these new endpoints to your views.py


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """Create Stripe checkout session for token purchase"""
    try:
        package_id = request.data.get("package_id")

        # Get the token package
        package = TokenPackage.objects.get(id=package_id)

        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": int(package.price * 100),  # Convert to cents
                        "product_data": {
                            "name": package.name,
                            "description": f"{package.tokens} Embroidery Tokens",
                            "images": [
                                os.getenv("FRONTEND_URL", "http://46.224.219.127")
                                + "/logo512.png"
                            ],
                        },
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=os.getenv("FRONTEND_URL", "http://46.224.219.127")
            + "/payment-success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=os.getenv("FRONTEND_URL", "http://46.224.219.127")
            + "/payment-cancel",
            client_reference_id=str(request.user.id),
            metadata={
                "user_id": request.user.id,
                "package_id": package_id,
                "tokens": package.tokens,
            },
        )

        return Response(
            {
                "success": True,
                "checkout_url": checkout_session.url,
                "session_id": checkout_session.id,
            }
        )

    except TokenPackage.DoesNotExist:
        return Response(
            {"error": "Package not found"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"❌ Stripe error: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def stripe_webhook(request):
    """Handle Stripe webhook events"""
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError as e:
        print(f"❌ Invalid payload: {e}")
        return Response(
            {"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST
        )
    except stripe.error.SignatureVerificationError as e:
        print(f"❌ Invalid signature: {e}")
        return Response(
            {"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST
        )

    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        session_id = session.get("id", "")

        # Fulfill the purchase
        user_id = session["metadata"]["user_id"]
        package_id = session["metadata"]["package_id"]
        tokens = int(session["metadata"]["tokens"])

        try:
            user = User.objects.get(id=user_id)
            package = TokenPackage.objects.get(id=package_id)
            
            # Check if tokens have already been added for this session (prevent duplicates)
            existing_transaction = TokenTransaction.objects.filter(
                user=user,
                description__contains=session_id
            ).exists()
            
            if existing_transaction:
                print(f"ℹ️ Webhook: Payment already processed for session: {session_id}")
                return Response({"success": True})

            # Add tokens to user
            profile = user.profile
            profile.tokens += tokens
            profile.save()

            # Create transaction record with session_id to prevent duplicates
            TokenTransaction.objects.create(
                user=user,
                type="purchase",
                amount=tokens,
                description=f"Purchased {package.name} via Stripe (session: {session_id})",
            )

            # Send token purchase email notification
            try:
                amount_paid = session.get("amount_total", 0) / 100  # Convert from cents
                send_token_purchase_email(user, package, amount_paid)
            except Exception as email_error:
                print(f"⚠️ Failed to send email notification: {str(email_error)}")

            print(
                f"✅ Webhook: Payment successful: User {user.username} received {tokens} tokens (session: {session_id})"
            )

        except Exception as e:
            print(f"❌ Error fulfilling purchase: {str(e)}")
            import traceback

            traceback.print_exc()

    return Response({"success": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """Verify payment session and return updated token balance"""
    session_id = request.query_params.get("session_id")

    if not session_id:
        return Response(
            {"error": "No session ID provided"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Retrieve the session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)

        if session.payment_status == "paid":
            # Get the token package info from session metadata
            package_id = session.metadata.get("package_id")
            tokens_to_add = int(session.metadata.get("tokens", 0))
            user_id = session.metadata.get("user_id")
            amount_paid = session.amount_total / 100  # Convert from cents
            
            # Verify the session belongs to this user
            if str(request.user.id) != str(user_id):
                return Response(
                    {"error": "Session does not belong to this user"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if tokens have already been added for this session
            # (by checking if a transaction with this session_id already exists)
            existing_transaction = TokenTransaction.objects.filter(
                user=request.user,
                description__contains=session_id
            ).exists()
            
            profile = request.user.profile
            
            if not existing_transaction and tokens_to_add > 0:
                # Tokens not added yet (webhook might have failed) - add them now
                profile.tokens += tokens_to_add
                profile.save()
                
                # Create transaction record with session_id to prevent duplicates
                try:
                    package = TokenPackage.objects.get(id=package_id) if package_id else None
                    description = f"Purchased {package.name if package else 'tokens'} via Stripe (session: {session_id})"
                except TokenPackage.DoesNotExist:
                    description = f"Purchased {tokens_to_add} tokens via Stripe (session: {session_id})"
                
                TokenTransaction.objects.create(
                    user=request.user,
                    type="purchase",
                    amount=tokens_to_add,
                    description=description,
                )
                
                print(f"✅ Payment verified & tokens added: User {request.user.username} received {tokens_to_add} tokens (session: {session_id})")
                
                # Send token purchase email
                try:
                    if package_id:
                        package = TokenPackage.objects.get(id=package_id)
                        send_token_purchase_email(request.user, package, amount_paid)
                except TokenPackage.DoesNotExist:
                    print(f"⚠️ Package {package_id} not found for email notification")
                except Exception as e:
                    print(f"⚠️ Failed to send token purchase email: {str(e)}")
            else:
                print(f"ℹ️ Payment already processed for session: {session_id}")
            
            # Refresh profile to get updated token count
            profile.refresh_from_db()
            
            return Response(
                {
                    "success": True,
                    "paid": True,
                    "tokens": profile.tokens,
                    "message": "Payment successful! Tokens have been added to your account.",
                }
            )
        else:
            return Response(
                {"success": False, "paid": False, "message": "Payment not completed"}
            )

    except Exception as e:
        print(f"❌ Payment verification error: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# ADMIN ENDPOINTS - Manual Digitization Workflow
# ============================================================================

def is_admin(user):
    """Check if user is admin/staff"""
    return user.is_staff or user.is_superuser


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_list_orders(request):
    """Admin: List all orders with filters"""
    if not is_admin(request.user):
        return Response(
            {"error": "Admin access required"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    status_filter = request.query_params.get("status")
    
    orders = Order.objects.all().select_related('user', 'design')
    
    if status_filter:
        orders = orders.filter(status=status_filter)
    
    serializer = OrderSerializer(orders, many=True, context={'request': request})
    return Response({
        "success": True,
        "orders": serializer.data,
        "count": orders.count()
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_get_order(request, order_id):
    """Admin: Get detailed order information"""
    if not is_admin(request.user):
        return Response(
            {"error": "Admin access required"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        order = Order.objects.select_related('user', 'design').get(id=order_id)
        return Response({
            "success": True,
            "order": OrderSerializer(order, context={'request': request}).data
        })
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_upload_files(request, order_id):
    """Admin: Upload embroidery files for any requested formats"""
    if not is_admin(request.user):
        return Response(
            {"error": "Admin access required"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        order = Order.objects.get(id=order_id)
        
        # All supported format codes
        all_formats = [
            # Industrial
            'dst', 'dsb', 'dsz', 'exp', 'tbf', 'fdr', 'stx',
            # Domestic  
            'pes', 'pec', 'jef', 'sew', 'hus', 'vip', 'vp3', 'xxx',
            # Commercial
            'cmd', 'tap', 'tim', 'emt', '10o', 'ds9'
        ]
        
        # Update order with any uploaded files
        for format_code in all_formats:
            file = request.FILES.get(format_code)
            if file:
                setattr(order, f'output_{format_code}', file)
        
        # Optional admin notes
        admin_notes = request.data.get("admin_notes")
        if admin_notes:
            order.admin_notes = admin_notes
        
        order.save()
        
        return Response({
            "success": True,
            "message": "Files uploaded successfully",
            "order": OrderSerializer(order, context={'request': request}).data
        })
        
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_order_resources(request, order_id):
    """Admin: Upload extra resource files for an order"""
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == "GET":
        # Both admin and customer can view resources
        if not request.user.is_staff and request.user != order.user:
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        resources = order.resources.all()
        serializer = OrderResourceSerializer(resources, many=True, context={'request': request})
        return Response({"success": True, "resources": serializer.data, "count": resources.count()})
    
    elif request.method == "POST":
        # Only admin can upload resources
        if not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        
        uploaded_files = request.FILES.getlist('files')
        if not uploaded_files:
            return Response({"error": "No files provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        description = request.data.get('description', '')
        created = []
        for f in uploaded_files:
            if f.size > 50 * 1024 * 1024:  # 50MB max per file
                return Response({"error": f"File {f.name} is too large (max 50MB)"}, status=status.HTTP_400_BAD_REQUEST)
            resource = OrderResource.objects.create(
                order=order,
                file=f,
                original_name=f.name,
                file_size=f.size,
                description=description,
                uploaded_by=request.user,
            )
            created.append(resource)
        
        serializer = OrderResourceSerializer(created, many=True, context={'request': request})
        return Response({
            "success": True,
            "message": f"{len(created)} resource(s) uploaded successfully",
            "resources": serializer.data
        }, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def admin_delete_resource(request, resource_id):
    """Admin: Delete a resource file"""
    if not request.user.is_staff:
        return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
    try:
        resource = OrderResource.objects.get(id=resource_id)
        resource.file.delete(save=False)
        resource.delete()
        return Response({"success": True, "message": "Resource deleted"})
    except OrderResource.DoesNotExist:
        return Response({"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_resource(request, resource_id):
    """Customer/Admin: Download a resource file"""
    try:
        resource = OrderResource.objects.select_related('order').get(id=resource_id)
        order = resource.order
        # Only the order owner or admin can download
        if not request.user.is_staff and request.user != order.user:
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        return FileResponse(
            resource.file.open('rb'),
            as_attachment=True,
            filename=resource.original_name
        )
    except OrderResource.DoesNotExist:
        return Response({"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_update_status(request, order_id):
    """Admin: Update order status (submitted -> processing -> completed/failed)"""
    if not is_admin(request.user):
        return Response(
            {"error": "Admin access required"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        order = Order.objects.get(id=order_id)
        
        new_status = request.data.get("status")
        admin_notes = request.data.get("admin_notes")
        
        if new_status not in ['submitted', 'processing', 'completed', 'failed']:
            return Response(
                {"error": "Invalid status. Must be: submitted, processing, completed, or failed"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Handle status-specific logic and emails
        if new_status == 'processing':
            # Send processing email
            try:
                send_order_processing_email(order)
            except Exception as e:
                logger.warning(f"Email notification failed for order {order.id}, but order status will still be updated: {str(e)}")
        
        elif new_status == 'completed':
            # Ensure all REQUESTED files are uploaded
            missing_files = []
            requested_formats = order.requested_formats or []
            
            for format_code in requested_formats:
                file_field = f'output_{format_code}'
                if not getattr(order, file_field, None):
                    missing_files.append(format_code.upper())
            
            if missing_files:
                return Response(
                    {
                        "error": f"Cannot mark as completed. Missing requested files: {', '.join(missing_files)}", 
                        "missing_files": missing_files
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            order.completed_at = timezone.now()
            order.design.status = 'completed'
            order.design.save()
            
            # Send completion email
            try:
                send_order_completed_email(order)
            except Exception as e:
                logger.warning(f"Email notification failed for order {order.id}, but order status will still be updated: {str(e)}")
        
        elif new_status == 'failed':
            # Send failure email with admin notes
            try:
                send_order_failed_email(order, admin_notes)
            except Exception as e:
                logger.warning(f"Email notification failed for order {order.id}, but order status will still be updated: {str(e)}")
        
        order.status = new_status
        
        # Reset email flag for new status so next transition will send email
        if new_status in ['processing', 'completed', 'failed']:
            order.email_sent = False
        
        if admin_notes:
            order.admin_notes = admin_notes
        
        order.save()
        logger.info(f"✅ Order {order.order_number} status updated to '{new_status}'")
        
        return Response({
            "success": True,
            "message": f"Order status updated to {new_status}",
            "order": OrderSerializer(order, context={'request': request}).data
        })
        
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


def send_order_completed_email(order):
    """Send email notification when order is completed"""
    from django.core.mail import send_mail
    
    try:
        subject = f"Order Completed - {order.order_number}"
        message = f"""
Hello {order.user.username},

Great news! Your embroidery digitization order is now complete!

Order Number: {order.order_number}
Design: {order.design.name}

You can now download your embroidery files in all 6 formats:
- DST (Tajima)
- PES (Brother)
- JEF (Janome)
- EXP (Melco)
- VP3 (Husqvarna Viking)
- XXX (Singer)

Login to your account to download your files: {settings.FRONTEND_URL}/orders

Best regards,
Embroidery AI Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [order.user.email],
            fail_silently=False,  # Raise exceptions to catch errors
        )
        
        order.email_sent = True
        order.notification_sent_at = timezone.now()
        order.save()
        logger.info(f"✅ Order completed email sent to {order.user.email} (Order #{order.order_number})")
    except Exception as e:
        logger.error(f"❌ Failed to send order completed email: {str(e)}")
        raise  # Re-raise to propagate error


def send_token_purchase_email(user, package, amount_paid):
    """Send email notification when user purchases tokens"""
    from django.core.mail import send_mail
    
    subject = f"Token Purchase Confirmation - {package.tokens} Tokens"
    message = f"""
Hello {user.username},

Thank you for your purchase! Your tokens have been successfully added to your account.

Purchase Details:
- Token Package: {package.name}
- Tokens Purchased: {package.tokens}
- Amount Paid: ${amount_paid}
- Price per Token: ${package.price_per_token:.2f}

Your Account Balance: {user.profile.tokens} tokens

You can now use these tokens to:
- Generate AI images with embroidery previews
- Submit embroidery digitization orders
- Download embroidery files in multiple formats

Start creating at: {settings.FRONTEND_URL}/

If you have any questions or need assistance, feel free to reach out to our support team.

Best regards,
Embroidery AI Team
    """
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=True,
        )
    except Exception as e:
        print(f"⚠️ Failed to send token purchase email: {str(e)}")


def send_order_processing_email(order):
    """Send email notification when order starts processing"""
    from django.core.mail import send_mail
    
    try:
        subject = f"Order Processing - {order.order_number}"
        message = f"""
Hello {order.user.username},

Great! Your embroidery digitization order has been received and is now being processed by our team.

Order Number: {order.order_number}
Design: {order.design.name}
Status: Processing

We're working on digitizing your design. You'll receive another notification as soon as your order is complete and ready for download.

Average processing time: 24-48 hours

If you have any questions, please contact our support team.

Best regards,
Embroidery AI Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [order.user.email],
            fail_silently=False,  # Raise exceptions to catch errors
        )
        
        order.email_sent = True
        order.notification_sent_at = timezone.now()
        order.save()
        logger.info(f"✅ Order processing email sent to {order.user.email} (Order #{order.order_number})")
    except Exception as e:
        logger.error(f"❌ Failed to send order processing email: {str(e)}")
        raise  # Re-raise to propagate error


def send_order_failed_email(order, admin_notes=None):
    """Send email notification when order fails"""
    from django.core.mail import send_mail
    
    try:
        subject = f"Order Failed - {order.order_number}"
        message = f"""
Hello {order.user.username},

Unfortunately, we were unable to complete your embroidery digitization order.

Order Number: {order.order_number}
Design: {order.design.name}
Status: Failed

"""
        
        if admin_notes:
            message += f"""Reason:
{admin_notes}

"""
        
        message += f"""
What's Next:
1. Review the reason provided above
2. You can resubmit your order with a modified design if needed
3. Your tokens have NOT been deducted - you can use them for other orders
4. Contact our support team if you believe this is an error

We're here to help! Please reach out to us with any questions.

Login to your account: {settings.FRONTEND_URL}/

Best regards,
Embroidery AI Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [order.user.email],
            fail_silently=False,  # Raise exceptions to catch errors
        )
        
        order.email_sent = True
        order.notification_sent_at = timezone.now()
        order.save()
        logger.info(f"✅ Order failed email sent to {order.user.email} (Order #{order.order_number})")
    except Exception as e:
        logger.error(f"❌ Failed to send order failed email: {str(e)}")
        raise  # Re-raise to propagate error


# ============================================================
# DESIGN FEATURE MANAGEMENT (STAFF AND CUSTOMER)
# ============================================================

def manage_design_features(request):
    """Get all design features or create a new one (staff only)"""
    if not request.user.is_staff:
        return Response(
            {"success": False, "error": "You don't have permission to access this resource."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if request.method == 'GET':
        # Get all features, optionally filter by active
        features = DesignFeature.objects.all()
        active_only = request.query_params.get('active', 'false').lower() == 'true'
        if active_only:
            features = features.filter(is_active=True)
        
        serializer = DesignFeatureSerializer(features, many=True)
        return Response({
            "success": True,
            "features": serializer.data,
            "count": features.count()
        })
    
    elif request.method == 'POST':
        serializer = DesignFeatureSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Design feature created successfully",
                "feature": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "success": False,
            "error": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_design_feature_detail(request, feature_id):
    """Get, update, or delete a specific design feature (staff only)"""
    if not request.user.is_staff:
        return Response(
            {"success": False, "error": "You don't have permission to access this resource."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        feature = DesignFeature.objects.get(id=feature_id)
    except DesignFeature.DoesNotExist:
        return Response(
            {"success": False, "error": "Feature not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = DesignFeatureSerializer(feature)
        return Response({
            "success": True,
            "feature": serializer.data
        })
    
    elif request.method == 'PUT':
        serializer = DesignFeatureSerializer(feature, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Feature updated successfully",
                "feature": serializer.data
            })
        return Response({
            "success": False,
            "error": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        feature.delete()
        return Response({
            "success": True,
            "message": "Feature deleted successfully"
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def list_available_features(request):
    """Get all active design features available for customers"""
    features = DesignFeature.objects.filter(is_active=True).order_by('sort_order')
    
    # Group by category
    from itertools import groupby
    grouped_features = {}
    for category, items in groupby(features, key=lambda x: x.get_category_display()):
        grouped_features[category] = DesignFeatureSerializer(list(items), many=True).data
    
    return Response({
        "success": True,
        "features": grouped_features,
        "total": features.count()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_feature_to_design(request):
    """Customer adds a feature to their design (uses tokens)"""
    design_id = request.data.get('design_id')
    feature_id = request.data.get('feature_id')
    
    if not design_id or not feature_id:
        return Response({
            "success": False,
            "error": "design_id and feature_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        design = Design.objects.get(id=design_id, user=request.user)
        feature = DesignFeature.objects.get(id=feature_id, is_active=True)
    except Design.DoesNotExist:
        return Response({
            "success": False,
            "error": "Design not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except DesignFeature.DoesNotExist:
        return Response({
            "success": False,
            "error": "Feature not found or is inactive"
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if feature already used
    if DesignFeatureUsage.objects.filter(design=design, feature=feature).exists():
        return Response({
            "success": False,
            "error": "This feature is already applied to this design"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user has enough tokens
    user_tokens = request.user.profile.tokens
    if user_tokens < feature.tokens_required:
        return Response({
            "success": False,
            "error": f"Insufficient tokens. You need {feature.tokens_required} tokens but have {user_tokens}"
        }, status=status.HTTP_402_PAYMENT_REQUIRED)
    
    # Deduct tokens and create usage record
    request.user.profile.tokens -= feature.tokens_required
    request.user.profile.save()
    
    # Record the usage
    usage = DesignFeatureUsage.objects.create(
        design=design,
        feature=feature,
        tokens_spent=feature.tokens_required
    )
    
    # Update design tokens_used
    design.tokens_used = (design.tokens_used or 0) + feature.tokens_required
    design.save()
    
    # Record token transaction
    TokenTransaction.objects.create(
        user=request.user,
        transaction_type='feature_usage',
        tokens_used=feature.tokens_required,
        design=design,
        description=f"Used feature: {feature.name}"
    )
    
    serializer = DesignFeatureUsageSerializer(usage)
    return Response({
        "success": True,
        "message": f"Feature '{feature.name}' added to design",
        "feature_usage": serializer.data,
        "remaining_tokens": request.user.profile.tokens
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_design_features(request, design_id):
    """Get all features applied to a specific design"""
    try:
        design = Design.objects.get(id=design_id, user=request.user)
    except Design.DoesNotExist:
        return Response({
            "success": False,
            "error": "Design not found"
        }, status=status.HTTP_404_NOT_FOUND)
    
    usages = design.feature_usages.all()
    serializer = DesignFeatureUsageSerializer(usages, many=True)
    
    return Response({
        "success": True,
        "design_id": design_id,
        "feature_usages": serializer.data,
        "total_tokens_spent": sum(u.tokens_spent for u in usages)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_feature_from_design(request):
    """Customer removes a feature from their design (refunds tokens)"""
    design_id = request.data.get('design_id')
    feature_id = request.data.get('feature_id')
    
    if not design_id or not feature_id:
        return Response({
            "success": False,
            "error": "design_id and feature_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        design = Design.objects.get(id=design_id, user=request.user)
        usage = DesignFeatureUsage.objects.get(design=design, feature_id=feature_id)
    except Design.DoesNotExist:
        return Response({
            "success": False,
            "error": "Design not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except DesignFeatureUsage.DoesNotExist:
        return Response({
            "success": False,
            "error": "Feature not applied to this design"
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Refund tokens
    tokens_to_refund = usage.tokens_spent
    request.user.profile.tokens += tokens_to_refund
    request.user.profile.save()
    
    # Update design tokens_used
    design.tokens_used = max(0, (design.tokens_used or 0) - tokens_to_refund)
    design.save()
    
    # Record refund transaction
    TokenTransaction.objects.create(
        user=request.user,
        transaction_type='feature_refund',
        tokens_used=-tokens_to_refund,  # Negative for refund
        design=design,
        description=f"Refunded feature: {usage.feature.name}"
    )
    
    usage.delete()
    
    return Response({
        "success": True,
        "message": f"Feature removed and {tokens_to_refund} tokens refunded",
        "remaining_tokens": request.user.profile.tokens
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feature_usage_stats(request):
    """Get customer's feature usage statistics"""
    if not request.user.is_staff:
        # Regular users only see their own stats
        usages = DesignFeatureUsage.objects.filter(design__user=request.user)
    else:
        # Staff can see all stats
        usages = DesignFeatureUsage.objects.all()
    
    # Group by feature
    feature_stats = {}
    for usage in usages:
        feature_name = usage.feature.name
        if feature_name not in feature_stats:
            feature_stats[feature_name] = {
                'feature_id': usage.feature.id,
                'total_usages': 0,
                'total_tokens_spent': 0
            }
        feature_stats[feature_name]['total_usages'] += 1
        feature_stats[feature_name]['total_tokens_spent'] += usage.tokens_spent
    
    return Response({
        "success": True,
        "feature_stats": feature_stats,
        "total_usages": usages.count(),
        "total_tokens_spent": sum(u.tokens_spent for u in usages)
    })

# ============================================================================
# TOKEN COST MANAGEMENT
# ============================================================================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def manage_token_costs(request):
    """Get or update token cost settings (Staff only)"""
    if not request.user.is_staff:
        return Response(
            {"error": "Only staff members can access this"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    from .models import TokenCostSettings
    
    if request.method == "GET":
        costs = TokenCostSettings.get_costs()
        return Response({
            "success": True,
            "costs": {
                "ai_image_generation": costs.ai_image_generation,
                "order_placement": costs.order_placement,
                "embroidery_preview": costs.embroidery_preview,
                "text_addition": costs.text_addition,
            }
        })
    
    elif request.method == "POST":
        costs = TokenCostSettings.get_costs()
        
        # Update costs from request
        if 'ai_image_generation' in request.data:
            costs.ai_image_generation = max(0, int(request.data['ai_image_generation']))
        if 'order_placement' in request.data:
            costs.order_placement = max(0, int(request.data['order_placement']))
        if 'embroidery_preview' in request.data:
            costs.embroidery_preview = max(0, int(request.data['embroidery_preview']))
        if 'text_addition' in request.data:
            costs.text_addition = max(0, int(request.data['text_addition']))
        
        costs.save()
        
        return Response({
            "success": True,
            "message": "Token costs updated successfully",
            "costs": {
                "ai_image_generation": costs.ai_image_generation,
                "order_placement": costs.order_placement,
                "embroidery_preview": costs.embroidery_preview,
                "text_addition": costs.text_addition,
            }
        })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def manage_embroidery_size_pricing(request):
    """Get all size pricing tiers or create a new one (Staff only)"""
    if not request.user.is_staff:
        return Response(
            {"success": False, "error": "You don't have permission to access this resource."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if request.method == "GET":
        # Get all pricing tiers sorted by size
        from .models import EmbroiderySizePricing
        from .serializers import EmbroiderySizePricingSerializer
        
        tiers = EmbroiderySizePricing.objects.all().order_by('size_cm')
        serializer = EmbroiderySizePricingSerializer(tiers, many=True)
        
        return Response({
            "success": True,
            "tiers": serializer.data,
            "count": tiers.count()
        })
    
    elif request.method == "POST":
        # Create a new pricing tier
        from .models import EmbroiderySizePricing
        from .serializers import EmbroiderySizePricingSerializer
        
        serializer = EmbroiderySizePricingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Pricing tier created successfully",
                "tier": serializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                "success": False,
                "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def manage_embroidery_size_pricing_detail(request, tier_id):
    """Update or delete a specific pricing tier (Staff only)"""
    if not request.user.is_staff:
        return Response(
            {"success": False, "error": "You don't have permission to access this resource."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    from .models import EmbroiderySizePricing
    from .serializers import EmbroiderySizePricingSerializer
    
    try:
        tier = EmbroiderySizePricing.objects.get(id=tier_id)
    except EmbroiderySizePricing.DoesNotExist:
        return Response(
            {"success": False, "error": "Pricing tier not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == "PUT":
        # Update pricing tier
        serializer = EmbroiderySizePricingSerializer(tier, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Pricing tier updated successfully",
                "tier": serializer.data
            })
        else:
            return Response({
                "success": False,
                "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        # Delete pricing tier
        tier.delete()
        return Response({
            "success": True,
            "message": "Pricing tier deleted successfully"
        })


# ============================================================================
# CHAT SYSTEM
# ============================================================================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def conversation_list(request):
    """
    GET: List all conversations for current user (customer or admin)
    POST: Create a new conversation for an order
    """
    try:
        if request.method == "GET":
            # Get all conversations for this user
            if request.user.is_staff:
                # Admins see all conversations
                conversations = Conversation.objects.all()
            else:
                # Customers see only their conversations
                conversations = Conversation.objects.filter(customer=request.user)
            
            serializer = ConversationListSerializer(conversations, many=True, context={'request': request})
            return Response({
                "success": True,
                "conversations": serializer.data,
                "count": conversations.count()
            })
        
        elif request.method == "POST":
            # Create conversation for an order
            order_id = request.data.get("order_id")
            
            if not order_id:
                return Response(
                    {"error": "order_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                order = Order.objects.get(id=order_id)
            except Order.DoesNotExist:
                return Response(
                    {"error": "Order not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Only customer or admin can create conversation
            if request.user != order.user and not request.user.is_staff:
                return Response(
                    {"error": "Not authorized"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if conversation already exists
            conversation, created = Conversation.objects.get_or_create(
                order=order,
                defaults={
                    'customer': order.user,
                    'admin': None
                }
            )
            
            serializer = ConversationSerializer(conversation)
            return Response({
                "success": True,
                "message": "Conversation created" if created else "Conversation already exists",
                "conversation": serializer.data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def conversation_detail(request, conversation_id):
    """
    GET: Get conversation details with all messages
    POST: Send a new message in the conversation
    """
    try:
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check authorization
        if request.user != conversation.customer and not request.user.is_staff:
            return Response(
                {"error": "Not authorized"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == "GET":
            # Mark all messages as read for current user
            unread_messages = conversation.messages.filter(is_read=False).exclude(sender=request.user)
            for message in unread_messages:
                message.mark_as_read()
            
            serializer = ConversationSerializer(conversation, context={'request': request})
            return Response({
                "success": True,
                "conversation": serializer.data
            })
        
        elif request.method == "POST":
            # Send a message (with optional attachment)
            content = request.data.get("message", "").strip()
            attachment = request.FILES.get("attachment")
            
            if not content and not attachment:
                return Response(
                    {"error": "Message or attachment is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate attachment if present
            if attachment:
                # Max 10MB
                if attachment.size > 10 * 1024 * 1024:
                    return Response(
                        {"error": "Attachment size must be less than 10MB"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Determine attachment type from content type
                content_type = attachment.content_type or ''
                if content_type.startswith('image/'):
                    attachment_type = 'image'
                elif content_type.startswith('video/'):
                    attachment_type = 'video'
                elif content_type in ['application/pdf']:
                    attachment_type = 'pdf'
                elif content_type.startswith('audio/'):
                    attachment_type = 'audio'
                else:
                    attachment_type = 'file'
            
            # If admin is replying, assign them to the conversation
            if request.user.is_staff and not conversation.admin:
                conversation.admin = request.user
                conversation.save()
            
            # Create message
            message_data = {
                'conversation': conversation,
                'sender': request.user,
                'content': content,
            }
            
            if attachment:
                message_data['attachment'] = attachment
                message_data['attachment_name'] = attachment.name
                message_data['attachment_size'] = attachment.size
                message_data['attachment_type'] = attachment_type
            
            message = Message.objects.create(**message_data)
            
            # Update conversation updated_at
            conversation.updated_at = timezone.now()
            conversation.save()
            
            serializer = MessageSerializer(message, context={'request': request})
            return Response({
                "success": True,
                "message": "Message sent",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_messages_count(request):
    """Get count of unread messages for current user"""
    try:
        if request.user.is_staff:
            # Admin sees all unread messages in their conversations
            unread = Message.objects.filter(
                conversation__admin=request.user,
                is_read=False
            ).exclude(sender=request.user).count()
        else:
            # Customer sees unread messages in their conversations
            unread = Message.objects.filter(
                conversation__customer=request.user,
                is_read=False
            ).exclude(sender=request.user).count()
        
        return Response({
            "success": True,
            "unread_count": unread
        })
    
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
