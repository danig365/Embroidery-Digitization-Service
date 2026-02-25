# Design Feature Management Endpoints
# This file contains all feature-related API endpoints
# Include these in your urls.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from .models import DesignFeature, DesignFeatureUsage, Design, TokenTransaction
from .serializers import DesignFeatureSerializer, DesignFeatureUsageSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
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
