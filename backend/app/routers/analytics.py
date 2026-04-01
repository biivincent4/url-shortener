from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import ClickEvent, URL, User
from app.schemas import ClickDetail, ClicksOverTime, TopReferrer, UrlStats

router = APIRouter(prefix="/api/urls", tags=["analytics"])


@router.get("/{short_code}/stats", response_model=UrlStats)
async def get_url_stats(
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

    # Total clicks
    total_result = await db.execute(
        select(func.count())
        .select_from(ClickEvent)
        .where(ClickEvent.url_id == url_entry.id)
    )
    total_clicks = total_result.scalar() or 0

    # Unique visitors (by ip_hash)
    unique_result = await db.execute(
        select(func.count(func.distinct(ClickEvent.ip_hash)))
        .select_from(ClickEvent)
        .where(ClickEvent.url_id == url_entry.id, ClickEvent.ip_hash.is_not(None))
    )
    unique_visitors = unique_result.scalar() or 0

    # Clicks over time (last 30 days, grouped by date)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    day_trunc = func.date_trunc("day", ClickEvent.clicked_at)

    clicks_time_result = await db.execute(
        select(
            day_trunc.label("day"),
            func.count().label("count"),
        )
        .where(
            ClickEvent.url_id == url_entry.id, ClickEvent.clicked_at >= thirty_days_ago
        )
        .group_by(day_trunc)
        .order_by(day_trunc)
    )
    clicks_over_time = [
        ClicksOverTime(date=row.day.date().isoformat(), clicks=row.count)
        for row in clicks_time_result.all()
    ]

    # Top referrers
    ref_result = await db.execute(
        select(
            ClickEvent.referrer,
            func.count().label("count"),
        )
        .where(ClickEvent.url_id == url_entry.id, ClickEvent.referrer.is_not(None))
        .group_by(ClickEvent.referrer)
        .order_by(func.count().desc())
        .limit(10)
    )
    top_referrers = [
        TopReferrer(referrer=row.referrer, clicks=row.count) for row in ref_result.all()
    ]

    # Recent clicks
    recent_result = await db.execute(
        select(ClickEvent)
        .where(ClickEvent.url_id == url_entry.id)
        .order_by(ClickEvent.clicked_at.desc())
        .limit(50)
    )
    recent_clicks = [
        ClickDetail(
            clicked_at=c.clicked_at,
            referrer=c.referrer,
            user_agent=c.user_agent,
        )
        for c in recent_result.scalars().all()
    ]

    return UrlStats(
        short_code=url_entry.short_code,
        original_url=url_entry.original_url,
        total_clicks=total_clicks,
        unique_visitors=unique_visitors,
        clicks_over_time=clicks_over_time,
        top_referrers=top_referrers,
        recent_clicks=recent_clicks,
    )
