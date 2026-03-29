import base64
import os
from cryptography.fernet import Fernet
from app.config import get_settings

def _get_fernet() -> Fernet:
    settings = get_settings()
    key_hex = settings.encryption_key
    key_bytes = bytes.fromhex(key_hex) if len(key_hex) == 64 else key_hex.encode()[:32].ljust(32, b'0')
    fernet_key = base64.urlsafe_b64encode(key_bytes[:32])
    return Fernet(fernet_key)

def encrypt_token(token: str) -> str:
    f = _get_fernet()
    return f.encrypt(token.encode()).decode()

def decrypt_token(encrypted: str) -> str:
    f = _get_fernet()
    return f.decrypt(encrypted.encode()).decode()
