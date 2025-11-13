from jose import JWTError, jwt
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")   # fallback
ALGORITHM = os.getenv("ALGORITHM", "HS256")        # fallback
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Generate JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(ZoneInfo("Asia/Kolkata")) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str):
    """Decode JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
