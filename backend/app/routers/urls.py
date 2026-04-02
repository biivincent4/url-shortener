import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user, limiter
from app.models import ClickEvent, URL, User
from app.schemas import ShortenRequest, ShortenResponse, UrlListItem
from app.utils import generate_short_code, hash_ip, validate_custom_code

router = APIRouter(tags=["urls"])

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "static"


@router.post("/api/shorten", response_model=ShortenResponse)
@limiter.limit("10/minute")
async def shorten_url(
    request: Request,
    body: ShortenRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    if body.custom_code:
        if not validate_custom_code(body.custom_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom code must be 3-20 alphanumeric characters, hyphens, or underscores",
            )
        result = await db.execute(select(URL).where(URL.short_code == body.custom_code))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Custom code already taken",
            )
        short_code = body.custom_code
    else:
        for _ in range(10):
            short_code = generate_short_code()
            result = await db.execute(select(URL).where(URL.short_code == short_code))
            if not result.scalar_one_or_none():
                break
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not generate unique short code",
            )

    expires_at = None
    if body.expires_in_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=body.expires_in_hours)

    url_entry = URL(
        short_code=short_code,
        original_url=str(body.url),
        user_id=user.id if user else None,
        expires_at=expires_at,
    )
    db.add(url_entry)
    await db.commit()
    await db.refresh(url_entry)

    return ShortenResponse(
        short_code=url_entry.short_code,
        short_url=f"{BACKEND_URL}/{url_entry.short_code}",
        original_url=url_entry.original_url,
        created_at=url_entry.created_at,
        expires_at=url_entry.expires_at,
    )


@router.get("/api/urls", response_model=list[UrlListItem])
async def list_urls(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(URL).where(URL.user_id == user.id).order_by(URL.created_at.desc())
    )
    urls = result.scalars().all()
    items = []
    for u in urls:
        click_result = await db.execute(
            select(ClickEvent).where(ClickEvent.url_id == u.id)
        )
        total_clicks = len(click_result.scalars().all())
        items.append(
            UrlListItem(
                id=u.id,
                short_code=u.short_code,
                short_url=f"{BACKEND_URL}/{u.short_code}",
                original_url=u.original_url,
                created_at=u.created_at,
                expires_at=u.expires_at,
                is_active=u.is_active,
                total_clicks=total_clicks,
            )
        )
    return items


@router.delete("/api/urls/{short_code}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_url(
    short_code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(URL).where(URL.short_code == short_code, URL.user_id == user.id)
    )
    url_entry = result.scalar_one_or_none()
    if not url_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    url_entry.is_active = False
    await db.commit()


@router.get("/{short_code}")
async def redirect_url(
    short_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(URL).where(URL.short_code == short_code))
    url_entry = result.scalar_one_or_none()
    if not url_entry:
        # Not a short code — serve SPA for client-side routing (e.g. /login, /dashboard)
        index = STATIC_DIR / "index.html"
        if index.exists():
            return FileResponse(index)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Short URL not found"
        )

    if not url_entry.is_active:
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="URL has been deactivated"
        )

    if url_entry.expires_at and url_entry.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="URL has expired")

    # Record click event asynchronously
    client_ip = request.client.host if request.client else ""
    click = ClickEvent(
        url_id=url_entry.id,
        referrer=request.headers.get("referer"),
        user_agent=request.headers.get("user-agent", "")[:512],
        ip_hash=hash_ip(client_ip) if client_ip else None,
    )
    db.add(click)
    await db.commit()

    return RedirectResponse(url=url_entry.original_url, status_code=302)
