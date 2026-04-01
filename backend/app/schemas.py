import datetime
import uuid

from pydantic import BaseModel, EmailStr, HttpUrl


# --- Auth ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str | None
    auth_provider: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ApiKeyResponse(BaseModel):
    api_key: str


# --- URLs ---
class ShortenRequest(BaseModel):
    url: HttpUrl
    custom_code: str | None = None
    expires_in_hours: int | None = None


class ShortenResponse(BaseModel):
    short_code: str
    short_url: str
    original_url: str
    created_at: datetime.datetime
    expires_at: datetime.datetime | None

    model_config = {"from_attributes": True}


class UrlListItem(BaseModel):
    id: uuid.UUID
    short_code: str
    short_url: str
    original_url: str
    created_at: datetime.datetime
    expires_at: datetime.datetime | None
    is_active: bool
    total_clicks: int

    model_config = {"from_attributes": True}


# --- Analytics ---
class ClickDetail(BaseModel):
    clicked_at: datetime.datetime
    referrer: str | None
    user_agent: str | None


class ClicksOverTime(BaseModel):
    date: str
    clicks: int


class TopReferrer(BaseModel):
    referrer: str
    clicks: int


class UrlStats(BaseModel):
    short_code: str
    original_url: str
    total_clicks: int
    unique_visitors: int
    clicks_over_time: list[ClicksOverTime]
    top_referrers: list[TopReferrer]
    recent_clicks: list[ClickDetail]
