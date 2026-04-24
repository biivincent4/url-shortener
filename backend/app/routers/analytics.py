from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import ClickEvent, URL, User
from app.schemas import (
    BrowserStats,
    CityStats,
    ClickDetail,
    ClicksOverTime,
    CountryStats,
    DeviceStats,
    OsStats,
    TopReferrer,
    UrlStats,
)

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
            country=c.country,
            city=c.city,
            device_type=c.device_type,
            os_name=c.os_name,
            browser=c.browser,
        )
        for c in recent_result.scalars().all()
    ]

    # Top countries
    country_result = await db.execute(
        select(ClickEvent.country, func.count().label("count"))
        .where(ClickEvent.url_id == url_entry.id, ClickEvent.country.is_not(None))
        .group_by(ClickEvent.country)
        .order_by(func.count().desc())
        .limit(10)
    )
    top_countries = [
        CountryStats(country=row.country, clicks=row.count)
        for row in country_result.all()
    ]

    # Top cities
    city_result = await db.execute(
        select(ClickEvent.city, func.count().label("count"))
        .where(ClickEvent.url_id == url_entry.id, ClickEvent.city.is_not(None))
        .group_by(ClickEvent.city)
        .order_by(func.count().desc())
        .limit(10)
    )
    top_cities = [
        CityStats(city=row.city, clicks=row.count) for row in city_result.all()
    ]

    # Device types
    device_result = await db.execute(
        select(ClickEvent.device_type, func.count().label("count"))
        .where(ClickEvent.url_id == url_entry.id, ClickEvent.device_type.is_not(None))
        .group_by(ClickEvent.device_type)
        .order_by(func.count().desc())
    )
    devices = [
        DeviceStats(device_type=row.device_type, clicks=row.count)
        for row in device_result.all()
    ]

    # Operating systems
    os_result = await db.execute(
        select(ClickEvent.os_name, func.count().label("count"))
        .where(ClickEvent.url_id == url_entry.id, ClickEvent.os_name.is_not(None))
        .group_by(ClickEvent.os_name)
        .order_by(func.count().desc())
        .limit(10)
    )
    operating_systems = [
        OsStats(os_name=row.os_name, clicks=row.count) for row in os_result.all()
    ]

    # Browsers
    browser_result = await db.execute(
        select(ClickEvent.browser, func.count().label("count"))
        .where(ClickEvent.url_id == url_entry.id, ClickEvent.browser.is_not(None))
        .group_by(ClickEvent.browser)
        .order_by(func.count().desc())
        .limit(10)
    )
    browsers = [
        BrowserStats(browser=row.browser, clicks=row.count)
        for row in browser_result.all()
    ]

    return UrlStats(
        short_code=url_entry.short_code,
        original_url=url_entry.original_url,
        total_clicks=total_clicks,
        unique_visitors=unique_visitors,
        clicks_over_time=clicks_over_time,
        top_referrers=top_referrers,
        recent_clicks=recent_clicks,
        top_countries=top_countries,
        top_cities=top_cities,
        devices=devices,
        operating_systems=operating_systems,
        browsers=browsers,
    )
