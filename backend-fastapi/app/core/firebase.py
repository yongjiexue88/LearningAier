"""Firebase Admin SDK initialization"""
import firebase_admin
from firebase_admin import credentials, firestore, storage
from functools import lru_cache
from app.config import get_settings
import json
import base64


@lru_cache()
def get_firebase_app():
    """Initialize and return Firebase Admin app (cached)"""
    settings = get_settings()
    
    # Initialize credentials
    if settings.firebase_credentials_json:
        # Try base64 decode or direct JSON
        try:
            cred_json = base64.b64decode(settings.firebase_credentials_json).decode()
        except Exception:
            # Not base64, treat as direct JSON string
            cred_json = settings.firebase_credentials_json
        
        try:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse FIREBASE_CREDENTIALS_JSON: {e}")
    elif settings.firebase_client_email and settings.firebase_private_key:
        # Use individual fields (fallback)
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "client_email": settings.firebase_client_email,
            "private_key": settings.firebase_private_key.replace("\\\\n", "\\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        })
    else:
        # Fallback to Application Default Credentials (ADC)
        # This works automatically on Cloud Run / GCE
        print("⚠️ No explicit credentials found, using Application Default Credentials")
        cred = credentials.ApplicationDefault()
    
    return firebase_admin.initialize_app(cred, {
        "storageBucket": settings.firebase_storage_bucket
    })


@lru_cache()
def get_firestore_client():
    """Get Firestore client (cached)"""
    get_firebase_app()
    return firestore.client()


@lru_cache()
def get_storage_bucket():
    """Get Cloud Storage bucket (cached)"""
    get_firebase_app()
    return storage.bucket()
