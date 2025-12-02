"""Firebase Admin SDK initialization"""
import firebase_admin
from firebase_admin import credentials, firestore, storage
from functools import lru_cache
from app.config import get_settings
import json
import base64
import os


@lru_cache()
def get_firebase_app():
    """Initialize and return Firebase Admin app (cached)"""
    settings = get_settings()
    
    # Priority 1: Try loading from local JSON file (for development)
    creds_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                   "firebase-credentials.json")
    if os.path.exists(creds_file_path):
        print(f"📁 Loading Firebase credentials from: {creds_file_path}")
        cred = credentials.Certificate(creds_file_path)
    elif settings.firebase_credentials_json:
        # Priority 2: Try base64 decode or direct JSON from env var
        try:
            cred_json = base64.b64decode(settings.firebase_credentials_json).decode()
        except Exception:
            # Not base64, treat as direct JSON string
            cred_json = settings.firebase_credentials_json

        try:
            cred_dict = json.loads(cred_json)
            # Handle potential newline escaping issues in private key
            if "private_key" in cred_dict:
                cred_dict["private_key"] = cred_dict["private_key"].replace("\\\\n", "\n")
            
            cred = credentials.Certificate(cred_dict)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse FIREBASE_CREDENTIALS_JSON: {e}")
    elif settings.firebase_client_email and settings.firebase_private_key:
        # Priority 3: Use individual fields (fallback)
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "client_email": settings.firebase_client_email,
            "private_key": settings.firebase_private_key.replace("\\\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        })
    else:
        # Priority 4: Fallback to Application Default Credentials (ADC)
        # This works automatically on Cloud Run / GCE
        print("⚠️  No explicit credentials found, using Application Default Credentials")
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
