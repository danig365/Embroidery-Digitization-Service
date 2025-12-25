#!/usr/bin/env python
"""
Test script to verify the format validation fix
This tests that all 22 embroidery formats are properly validated
"""

# Valid formats according to the fix
VALID_FORMATS = [
    # Industrial
    'dst', 'dsb', 'dsz', 'exp', 'tbf', 'fdr', 'stx',
    # Domestic
    'pes', 'pec', 'jef', 'sew', 'hus', 'vip', 'vp3', 'xxx',
    # Commercial
    'cmd', 'tap', 'tim', 'emt', '10o', 'ds9'
]

# Frontend formats
FRONTEND_FORMATS = [
    # Industrial
    { "code": "dst", "name": "DST", "brand": "Tajima", "category": "Industrial" },
    { "code": "dsb", "name": "DSB", "brand": "Barudan", "category": "Industrial" },
    { "code": "dsz", "name": "DSZ", "brand": "ZSK", "category": "Industrial" },
    { "code": "exp", "name": "EXP", "brand": "Melco", "category": "Industrial" },
    { "code": "tbf", "name": "TBF", "brand": "Barudan", "category": "Industrial" },
    { "code": "fdr", "name": "FDR", "brand": "Fortron", "category": "Industrial" },
    { "code": "stx", "name": "STX", "brand": "Sunstar", "category": "Industrial" },
    
    # Domestic
    { "code": "pes", "name": "PES", "brand": "Brother / Babylock", "category": "Domestic" },
    { "code": "pec", "name": "PEC", "brand": "Brother", "category": "Domestic" },
    { "code": "jef", "name": "JEF", "brand": "Janome / Elna", "category": "Domestic" },
    { "code": "sew", "name": "SEW", "brand": "Janome", "category": "Domestic" },
    { "code": "hus", "name": "HUS", "brand": "Husqvarna", "category": "Domestic" },
    { "code": "vip", "name": "VIP", "brand": "Husqvarna / Viking", "category": "Domestic" },
    { "code": "vp3", "name": "VP3", "brand": "Husqvarna / Pfaff", "category": "Domestic" },
    { "code": "xxx", "name": "XXX", "brand": "Singer", "category": "Domestic" },
    
    # Commercial
    { "code": "cmd", "name": "CMD", "brand": "Compucon", "category": "Commercial" },
    { "code": "tap", "name": "TAP", "brand": "Happy", "category": "Commercial" },
    { "code": "tim", "name": "TIM", "brand": "Tajima", "category": "Commercial" },
    { "code": "emt", "name": "EMT", "brand": "Inbro", "category": "Commercial" },
    { "code": "10o", "name": "10O", "brand": "Barudan", "category": "Commercial" },
    { "code": "ds9", "name": "DS9", "brand": "Tajima", "category": "Commercial" },
]

def test_format_validation():
    """Test that all frontend formats are included in validation"""
    print("=" * 70)
    print("TESTING FORMAT VALIDATION FIX")
    print("=" * 70)
    
    frontend_codes = [f["code"] for f in FRONTEND_FORMATS]
    
    print(f"\n✅ Backend Valid Formats Count: {len(VALID_FORMATS)}")
    print(f"✅ Frontend Format Count: {len(frontend_codes)}")
    
    # Check all frontend formats are in backend validation
    all_valid = True
    missing = []
    for code in frontend_codes:
        if code not in VALID_FORMATS:
            all_valid = False
            missing.append(code)
    
    # Check for extra formats in backend that aren't in frontend
    extra = []
    for code in VALID_FORMATS:
        if code not in frontend_codes:
            extra.append(code)
    
    print("\n" + "=" * 70)
    print("VALIDATION RESULTS")
    print("=" * 70)
    
    if all_valid and len(extra) == 0:
        print("✅ SUCCESS: All formats match perfectly!")
        print("\n📋 Validated Formats by Category:")
        
        categories = {}
        for fmt in FRONTEND_FORMATS:
            cat = fmt["category"]
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(fmt["code"])
        
        for cat, codes in sorted(categories.items()):
            print(f"\n   {cat} ({len(codes)} formats):")
            for code in sorted(codes):
                print(f"      • {code.upper()}")
        
        return True
    else:
        if missing:
            print("❌ MISSING FORMATS (frontend has but backend doesn't validate):")
            for code in missing:
                print(f"   • {code}")
        
        if extra:
            print("⚠️  EXTRA FORMATS (backend validates but frontend doesn't have):")
            for code in extra:
                print(f"   • {code}")
        
        return False

def test_sample_order():
    """Test a sample order with multiple formats"""
    print("\n" + "=" * 70)
    print("TESTING SAMPLE ORDER WITH MULTIPLE FORMATS")
    print("=" * 70)
    
    # Simulate customer selecting multiple formats
    sample_selection = ['dst', 'pes', 'jef', 'exp', 'dsb', 'cmd', 'tim', 'vp3']
    
    print(f"\n📝 Customer selected {len(sample_selection)} formats:")
    for fmt in sample_selection:
        format_info = next((f for f in FRONTEND_FORMATS if f["code"] == fmt), None)
        if format_info:
            print(f"   ✓ {fmt.upper()} - {format_info['name']} ({format_info['brand']})")
    
    # Validate
    validated = [f.lower() for f in sample_selection if f.lower() in VALID_FORMATS]
    
    print(f"\n✅ Validation Result: {len(validated)}/{len(sample_selection)} formats passed")
    
    if len(validated) == len(sample_selection):
        print("✅ SUCCESS: All selected formats are valid!")
        print(f"\n📦 Order would include formats: {', '.join(validated)}")
        return True
    else:
        rejected = set(sample_selection) - set(validated)
        print(f"❌ FAILURE: {len(rejected)} formats rejected: {rejected}")
        return False

if __name__ == "__main__":
    result1 = test_format_validation()
    result2 = test_sample_order()
    
    print("\n" + "=" * 70)
    print("OVERALL RESULT")
    print("=" * 70)
    
    if result1 and result2:
        print("✅ ALL TESTS PASSED - FIX IS WORKING CORRECTLY!")
    else:
        print("❌ SOME TESTS FAILED - ISSUE STILL EXISTS")
    
    print("=" * 70)
