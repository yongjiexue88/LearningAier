"""Firebase Authentication middleware"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth


security = HTTPBearer()


from typing import Optional

class AuthenticatedUser:
    """Represents an authenticated user from Firebase"""
    
    def __init__(self, uid: str, email: Optional[str] = None):
        self.uid = uid
        self.email = email


async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthenticatedUser:
    """
    Verify Firebase ID token and return authenticated user.
    Use as a FastAPI dependency in route handlers.
    
    Example:
        @app.get("/protected")
        async def protected_route(user: AuthenticatedUser = Depends(verify_firebase_token)):
            return {"user_id": user.uid}
    """
    token = credentials.credentials
    
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email")
        return AuthenticatedUser(uid=uid, email=email)
    except auth.InvalidIdTokenError as e:
        print(f"❌ Auth Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )
    except Exception as e:
        print(f"❌ Auth Exception: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


async def get_current_user_id(
    user: AuthenticatedUser = Depends(verify_firebase_token)
) -> str:
    """
    Get the current user's ID from the authenticated user.
    Convenience dependency for endpoints that only need the user ID.
    
    Example:
        @app.get("/protected")
        async def protected_route(user_id: str = Depends(get_current_user_id)):
            return {"user_id": user_id}
    """
    return user.uid
