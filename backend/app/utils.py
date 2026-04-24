import hashlib
import os
import re
import secrets
import string

from user_agents import parse as _parse_ua

try:
    import geoip2.database
    import geoip2.errors

    _HAS_GEOIP = True
except ImportError:
    _HAS_GEOIP = False

BASE62_CHARS = string.ascii_letters + string.digits  # a-zA-Z0-9
SHORT_CODE_LENGTH = 6
CUSTOM_CODE_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,20}$")

GEOIP_DB_PATH = os.environ.get("GEOIP_DB_PATH", "/app/GeoLite2-City.mmdb")
_geo_reader = None
_geo_initialized = False


def generate_short_code(length: int = SHORT_CODE_LENGTH) -> str:
    return "".join(secrets.choice(BASE62_CHARS) for _ in range(length))


def validate_custom_code(code: str) -> bool:
    return bool(CUSTOM_CODE_PATTERN.match(code))


def hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


def generate_api_key() -> str:
    return secrets.token_urlsafe(32)


def parse_user_agent(ua_string: str | None) -> dict:
    """Parse a user-agent string into device_type, os_name, browser."""
    if not ua_string:
        return {"device_type": None, "os_name": None, "browser": None}
    ua = _parse_ua(ua_string)
    if ua.is_mobile:
        device_type = "Mobile"
    elif ua.is_tablet:
        device_type = "Tablet"
    elif ua.is_pc:
        device_type = "Desktop"
    elif ua.is_bot:
        device_type = "Bot"
    else:
        device_type = "Other"
    return {
        "device_type": device_type,
        "os_name": ua.os.family or None,
        "browser": ua.browser.family or None,
    }


def lookup_geo(ip: str) -> dict:
    """Look up country/city from IP using GeoLite2. Returns nulls if DB not available."""
    global _geo_reader, _geo_initialized
    if not _HAS_GEOIP:
        return {"country": None, "city": None}
    if not _geo_initialized:
        _geo_initialized = True
        try:
            _geo_reader = geoip2.database.Reader(GEOIP_DB_PATH)
        except (FileNotFoundError, OSError):
            _geo_reader = None
    if not _geo_reader:
        return {"country": None, "city": None}
    try:
        response = _geo_reader.city(ip)
        return {
            "country": response.country.iso_code,
            "city": response.city.name,
        }
    except (geoip2.errors.AddressNotFoundError, ValueError):
        return {"country": None, "city": None}
