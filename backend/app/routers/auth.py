import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import RedirectResponse

from app.database import get_db
from app.dependencies import (
    create_access_token,
    get_current_user,
    hash_api_key,
    hash_password,
    verify_password,
)
from app.models import User
from app.oauth import oauth
from app.schemas import (
    ApiKeyResponse,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from app.utils import generate_api_key

router = APIRouter(prefix="/api/auth", tags=["auth"])

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    user = User(
        email=body.email,
        display_name=body.display_name,
        auth_provider="email",
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if (
        not user
        or not user.password_hash
        or not verify_password(body.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user


@router.post("/api-key/regenerate", response_model=ApiKeyResponse)
async def regenerate_api_key(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw_key = generate_api_key()
    user.api_key_hash = hash_api_key(raw_key)
    await db.commit()
    return ApiKeyResponse(api_key=raw_key)


# --- Google OAuth ---
@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = f"{BACKEND_URL}/api/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token_data = await oauth.google.authorize_access_token(request)
    user_info = token_data.get("userinfo", {})
    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Could not get email from Google")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            display_name=user_info.get("name"),
            auth_provider="google",
            oauth_id=user_info.get("sub"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    jwt_token = create_access_token(str(user.id))
    return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback#token={jwt_token}")


# --- X (Twitter) OAuth ---
@router.get("/x/login")
async def x_login(request: Request):
    redirect_uri = f"{BACKEND_URL}/api/auth/x/callback"
    return await oauth.x.authorize_redirect(request, redirect_uri)


@router.get("/x/callback")
async def x_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token_data = await oauth.x.authorize_access_token(request)
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Could not get token from X")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.twitter.com/2/users/me",
            params={"user.fields": "id,name,username"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=400, detail="Could not get user info from X"
            )
        x_user = resp.json().get("data", {})

    x_id = x_user.get("id")
    username = x_user.get("username", "")
    display_name = x_user.get("name", username)
    email = f"{username}@x.placeholder"

    result = await db.execute(
        select(User).where(User.auth_provider == "x", User.oauth_id == x_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            display_name=display_name,
            auth_provider="x",
            oauth_id=x_id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    jwt_token = create_access_token(str(user.id))
    return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback#token={jwt_token}")
