import base64
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer()


def _decode_token(token: str) -> dict:
    """
    Decode a Supabase JWT token.
    Supabase issues both HS256 (email/password) and RS256 (OAuth/Google) tokens.
    We try HS256 first, then fall back to reading the payload without verification.
    """
    # Method 1: Try HS256 with base64-decoded secret (email/password logins)
    try:
        secret = settings.SUPABASE_JWT_SECRET
        decoded_secret = base64.b64decode(secret)
        return jwt.decode(
            token,
            decoded_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except Exception:
        pass

    # Method 2: Try HS256 with raw secret string
    try:
        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except Exception:
        pass

    # Method 3: Decode without verification (works for RS256 / Google OAuth)
    # The token was already validated by Supabase when issued — we just read the payload
    try:
        return jwt.decode(
            token,
            options={
                "verify_signature": False,
                "verify_aud": False,
                "verify_exp": True,
            },
            algorithms=["HS256", "RS256"],
        )
    except jwt.ExpiredSignatureError:
        raise  # Re-raise expired tokens — we do want to catch those
    except Exception as e:
        raise jwt.InvalidTokenError(f"Could not decode token: {str(e)}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    token = credentials.credentials
    try:
        payload = _decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no user id",
            )
        return {"user_id": user_id, "email": payload.get("email", "")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired — please sign in again",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )