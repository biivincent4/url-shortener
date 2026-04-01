import hashlib
import re
import secrets
import string

BASE62_CHARS = string.ascii_letters + string.digits  # a-zA-Z0-9
SHORT_CODE_LENGTH = 6
CUSTOM_CODE_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,20}$")


def generate_short_code(length: int = SHORT_CODE_LENGTH) -> str:
    return "".join(secrets.choice(BASE62_CHARS) for _ in range(length))


def validate_custom_code(code: str) -> bool:
    return bool(CUSTOM_CODE_PATTERN.match(code))


def hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


def generate_api_key() -> str:
    return secrets.token_urlsafe(32)
