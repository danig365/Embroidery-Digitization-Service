# Embroidery Size-Based Pricing System

## Overview

The system now supports **dynamic pricing based on embroidery size**. Instead of charging a fixed cost per order, the admin can configure different prices for different embroidery sizes (5cm to 40cm), and the system automatically calculates the cost based on the size the customer requests.

## Business Logic

**Example Setup** (Admin Configures):
```
5cm  = 10 tokens
15cm = 17 tokens
25cm = 25 tokens
40cm = 30 tokens
```

**How It Works**:
- Customer specifies embroidery size when adding to cart (5-40 cm)
- System calculates price for that size using **linear interpolation**
- Example: Customer requests 20cm → system calculates ~22 tokens (interpolated between 15cm and 25cm)
- When order is placed, tokens deducted = size-based price

**Price Interpolation Formula**:
```
If size = 20cm, 15cm costs 17 tokens, 25cm costs 25 tokens:
ratio = (20 - 15) / (25 - 15) = 0.5
price = 17 + (25 - 17) * 0.5 = 17 + 4 = 21 tokens
```

## Database Changes

### New Model: `EmbroiderySizePricing`
```python
class EmbroiderySizePricing(models.Model):
    size_cm = models.IntegerField(unique=True)  # e.g., 5, 10, 15, 20, etc.
    price_in_tokens = models.IntegerField()     # token cost for this size
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Updated Models
- **Order**: Added `embroidery_size_cm` field to store requested size
- **Cart**: Added `embroidery_size_cm` field to store size per cart item

### Static Method
- **EmbroiderySizePricing.get_price_for_size(size_cm)**: Returns token price for any size using interpolation

## Admin Interface

### Frontend Component
A new admin dashboard tab has been created: **"Size Pricing"**

**Location**: Admin Dashboard → Size Pricing Tab

**Features**:
- View all configured pricing tiers in a clean list
- Add new pricing tiers with size and token cost
- Edit existing tiers inline
- Delete tiers with confirmation
- Real-time updates
- Error handling and success notifications
- Helpful information box explaining interpolation

### How to Use the Admin Dashboard

1. **Login as admin** (staff member)
2. **Navigate to Admin Dashboard**
3. **Click "Size Pricing" tab** (new tab with Package icon)
4. **Add pricing tiers**:
   - Enter size in cm (5-40)
   - Enter price in tokens
   - Click "Add Tier"
5. **Edit a tier**: Click "Edit" button, modify values, click "Save"
6. **Delete a tier**: Click "Delete" button, confirm deletion

### Recommended Setup Steps

**Step 1: Add minimum tier (5cm)**
```
Size: 5
Price: 10 tokens
Click: Add Tier
```

**Step 2: Add middle tier (25cm)**
```
Size: 25
Price: 25 tokens
Click: Add Tier
```

**Step 3: Add maximum tier (40cm)**
```
Size: 40
Price: 30 tokens
Click: Add Tier
```

**Result**: System now handles all sizes 5-40cm with automatic interpolation!

### Endpoints

**GET `/api/admin/embroidery-size-pricing/`**
- Get all configured size pricing tiers
- Returns: List of all tiers sorted by size
- Requires: Staff authentication

**POST `/api/admin/embroidery-size-pricing/`**
- Create a new pricing tier
- Body:
  ```json
  {
    "size_cm": 5,
    "price_in_tokens": 10
  }
  ```
- Requires: Staff authentication

**PUT `/api/admin/embroidery-size-pricing/{tier_id}/`**
- Update a pricing tier
- Body: `{ "size_cm": 5, "price_in_tokens": 12 }`
- Requires: Staff authentication

**DELETE `/api/admin/embroidery-size-pricing/{tier_id}/`**
- Delete a pricing tier
- Requires: Staff authentication

### Admin Setup Instructions

1. **Login as staff member** (must have `is_staff=True`)
2. **Navigate to embroidery size pricing management** (admin dashboard)
3. **Create pricing tiers**:
   - Minimum tier (e.g., 5cm = 10 tokens)
   - Maximum tier (e.g., 40cm = 30 tokens)
   - Intermediate tiers for better accuracy (optional)
4. **Save configuration**
5. **System automatically calculates** prices for any size between min and max

### Recommended Setup

For best pricing accuracy with linear interpolation:
```
5cm   → 10 tokens
15cm  → 17 tokens
25cm  → 25 tokens
40cm  → 30 tokens
```

This gives:
- 5-15cm range: ~10-17 tokens (small designs)
- 15-25cm range: ~17-25 tokens (medium designs)
- 25-40cm range: ~25-30 tokens (large designs)

## Frontend Implementation

### Cart Item Structure

When adding to cart, include size:
```javascript
// Customer selects size and adds to cart
{
  design_id: 1,
  embroidery_size_cm: 20  // Customer selected size
}
```

### Checkout

When checking out, size is passed automatically:
```javascript
POST /api/cart/checkout/
{
  "requested_formats": ["dst", "pes", "jef"]
}
// Cart items already have embroidery_size_cm from when they were added
```

### Price Display

Show calculated price to customer before checkout:
```javascript
// Customer can see: "20cm embroidery = 22 tokens"
// This is calculated from EmbroiderySizePricing.get_price_for_size(20)
```

## API Integration

### Adding to Cart

When customer adds design to cart with size:
```
POST /api/designs/{design_id}/add-to-cart/
{
  "embroidery_size_cm": 20
}
```

### Creating Order from Single Design

```
POST /api/orders/create/
{
  "design_id": 1,
  "embroidery_size_cm": 20
}
```

### Checkout Cart

```
POST /api/cart/checkout/
{
  "requested_formats": ["dst", "pes", "jef"]
}
// Size is stored in cart items, system calculates total cost automatically
```

## Order Details

When order is created, it includes:
```json
{
  "id": 1,
  "order_number": "ORD-2025-001",
  "user": 1,
  "design": 1,
  "embroidery_size_cm": 20,
  "tokens_used": 22,
  "status": "submitted",
  "requested_formats": ["dst", "pes", "jef"],
  "created_at": "2025-12-23T10:30:00Z"
}
```

## Cost Calculation Examples

### Example 1: Admin Configuration
```
10cm = 15 tokens
30cm = 25 tokens
```

Customer requests:
- 10cm → 15 tokens
- 15cm → 20 tokens (interpolated)
- 20cm → 22 tokens (interpolated)
- 30cm → 25 tokens
- 40cm → 25 tokens (capped at max)

### Example 2: Multiple Items in Cart
```
Design 1: 10cm = 15 tokens
Design 2: 20cm = 22 tokens
Design 3: 35cm = 25 tokens

Total: 15 + 22 + 25 = 62 tokens
```

## Migration Guide

If upgrading from fixed pricing to size-based:

1. **Backup database** (important!)
2. **Run migration**:
   ```bash
   python manage.py migrate
   ```
3. **Configure pricing tiers** via admin endpoints
4. **Update frontend** to accept size input
5. **Existing orders** keep their `tokens_used` value
6. **New orders** use size-based pricing

## Database Queries

### Get All Pricing Tiers
```python
from api.models import EmbroiderySizePricing

tiers = EmbroiderySizePricing.objects.all().order_by('size_cm')
for tier in tiers:
    print(f"{tier.size_cm}cm = {tier.price_in_tokens} tokens")
```

### Get Price for Size
```python
from api.models import EmbroiderySizePricing

price = EmbroiderySizePricing.get_price_for_size(20)
print(f"Price for 20cm: {price} tokens")
```

### Orders with Size Info
```python
from api.models import Order

# Orders submitted for embroidery
orders = Order.objects.filter(status='submitted').values(
    'id', 'order_number', 'embroidery_size_cm', 'tokens_used'
)

for order in orders:
    print(f"{order['order_number']}: {order['embroidery_size_cm']}cm = {order['tokens_used']} tokens")
```

## Features

✅ Dynamic pricing based on embroidery size  
✅ Linear interpolation for smooth price curves  
✅ Admin can configure any size range  
✅ Automatic price calculation  
✅ Size stored with each order for records  
✅ Fallback to default if no tiers configured  
✅ Works with all order submission methods (cart, single design)  
✅ Email notifications include size in order details  

## Troubleshooting

### No pricing tiers configured
- System returns default price (10 tokens)
- Admin should create at least 2 tiers (min and max)

### Price seems wrong
- Verify tiers are configured correctly
- Check EmbroiderySizePricing table directly
- Test with: `EmbroiderySizePricing.get_price_for_size(20)`

### Customer sees different price
- Ensure Cart item has correct `embroidery_size_cm`
- Check that price calculation happens at checkout time
- Size should be captured when added to cart

## Future Enhancements

1. **Bulk pricing**: Different rates for multiple designs
2. **Material-based pricing**: Add fabric/material selection
3. **Rush orders**: Premium pricing for expedited processing
4. **Stitch count pricing**: Price based on stitch complexity
5. **Seasonal pricing**: Adjust prices by season
6. **Custom pricing rules**: Use discount codes at checkout

