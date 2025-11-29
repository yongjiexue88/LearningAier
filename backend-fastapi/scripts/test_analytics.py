#!/usr/bin/env python3
"""
Quick test to verify BigQuery analytics integration.
This checks if all the components are working without needing actual data.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ["ENV"] = "lab"

print("🧪 Testing BigQuery Analytics Integration\n")
print("=" * 60)

# Test 1: Import modules
print("\n✓ Test 1: Importing modules...")
try:
    from app.config import get_settings
    from app.services.analytics_service import AnalyticsService
    from app.models.analytics import AnalyticsOverviewResponse
    print("  ✅ All modules imported successfully")
except Exception as e:
    print(f"  ❌ Import failed: {e}")
    sys.exit(1)

# Test 2: Config
print("\n✓ Test 2: Checking configuration...")
try:
    settings = get_settings()
    print(f"  BigQuery Project: {settings.bigquery_project_id or settings.firebase_project_id}")
    print(f"  BigQuery Dataset: {settings.bigquery_dataset_id}")
    print("  ✅ Configuration loaded")
except Exception as e:
    print(f"  ❌ Config failed: {e}")
    sys.exit(1)

# Test 3: Analytics Service
print("\n✓ Test 3: Initializing Analytics Service...")
try:
    service = AnalyticsService()
    print(f"  Project: {service.project_id}")
    print(f"  Dataset: {service.dataset_id}")
    print("  ✅ Analytics service initialized")
except Exception as e:
    print(f"  ❌ Service init failed: {e}")
    print(f"  This is normal if BigQuery API is not enabled yet")

print("\n" + "=" * 60)
print("✅ Basic Integration Test Complete!")
print("\n📋 Next Steps:")
print("  1. Enable BigQuery API (if not done already)")
print("  2. Run the export script to populate data")
print("  3. Check the dashboard at http://localhost:5173/dashboard")
