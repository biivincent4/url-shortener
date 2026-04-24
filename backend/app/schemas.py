import datetime
import uuid

from pydantic import BaseModel, EmailStr, Field, HttpUrl


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
    tag_ids: list[uuid.UUID] | None = None


class UpdateUrlRequest(BaseModel):
    url: HttpUrl


class BulkShortenItem(BaseModel):
    url: HttpUrl
    custom_code: str | None = None
    expires_in_hours: int | None = None


class BulkShortenRequest(BaseModel):
    urls: list[BulkShortenItem] = Field(..., max_length=100)


class BulkResultItem(BaseModel):
    index: int
    result: "ShortenResponse | None" = None
    error: str | None = None


class ShortenResponse(BaseModel):
    short_code: str
    short_url: str
    original_url: str
    created_at: datetime.datetime
    expires_at: datetime.datetime | None

    model_config = {"from_attributes": True}


class BulkShortenResponse(BaseModel):
    results: list[BulkResultItem]


# --- Tags ---
class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class TagResponse(BaseModel):
    id: uuid.UUID
    name: str
    color: str | None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class TagBrief(BaseModel):
    id: uuid.UUID
    name: str
    color: str | None

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
    tags: list[TagBrief] = []

    model_config = {"from_attributes": True}


# --- Analytics ---
class ClickDetail(BaseModel):
    clicked_at: datetime.datetime
    referrer: str | None
    user_agent: str | None
    country: str | None = None
    city: str | None = None
    device_type: str | None = None
    os_name: str | None = None
    browser: str | None = None


class ClicksOverTime(BaseModel):
    date: str
    clicks: int


class TopReferrer(BaseModel):
    referrer: str
    clicks: int


class CountryStats(BaseModel):
    country: str
    clicks: int


class CityStats(BaseModel):
    city: str
    clicks: int


class DeviceStats(BaseModel):
    device_type: str
    clicks: int


class OsStats(BaseModel):
    os_name: str
    clicks: int


class BrowserStats(BaseModel):
    browser: str
    clicks: int


class UrlStats(BaseModel):
    short_code: str
    original_url: str
    total_clicks: int
    unique_visitors: int
    clicks_over_time: list[ClicksOverTime]
    top_referrers: list[TopReferrer]
    recent_clicks: list[ClickDetail]
    top_countries: list[CountryStats] = []
    top_cities: list[CityStats] = []
    devices: list[DeviceStats] = []
    operating_systems: list[OsStats] = []
    browsers: list[BrowserStats] = []
