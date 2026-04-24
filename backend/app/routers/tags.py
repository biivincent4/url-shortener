from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Tag, URL, User, url_tags
from app.schemas import TagCreate, TagResponse

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    body: TagCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag).where(Tag.name == body.name, Tag.user_id == user.id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Tag already exists"
        )
    tag = Tag(name=body.name, color=body.color, user_id=user.id)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.get("", response_model=list[TagResponse])
async def list_tags(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag).where(Tag.user_id == user.id).order_by(Tag.name)
    )
    return result.scalars().all()


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == user.id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await db.delete(tag)
    await db.commit()


@router.post("/{tag_id}/urls/{short_code}", status_code=status.HTTP_204_NO_CONTENT)
async def add_tag_to_url(
    tag_id: str,
    short_code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tag_result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == user.id)
    )
    tag = tag_result.scalar_one_or_none()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found"
        )

    url_result = await db.execute(
        select(URL).where(URL.short_code == short_code, URL.user_id == user.id)
    )
    url_entry = url_result.scalar_one_or_none()
    if not url_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="URL not found"
        )

    if tag not in url_entry.tags:
        url_entry.tags.append(tag)
        await db.commit()


@router.delete("/{tag_id}/urls/{short_code}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tag_from_url(
    tag_id: str,
    short_code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tag_result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == user.id)
    )
    tag = tag_result.scalar_one_or_none()
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found"
        )

    url_result = await db.execute(
        select(URL).where(URL.short_code == short_code, URL.user_id == user.id)
    )
    url_entry = url_result.scalar_one_or_none()
    if not url_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="URL not found"
        )

    if tag in url_entry.tags:
        url_entry.tags.remove(tag)
        await db.commit()
