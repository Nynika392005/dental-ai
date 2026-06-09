from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.education import Article, Bookmark, OralHealthTip
from app.models.user import User
from app.schemas.education import ArticleResponse, OralHealthTipResponse
from app.dependencies import get_current_user
import uuid
import random

router = APIRouter(prefix="/education", tags=["education"])

@router.get("/articles", response_model=list[ArticleResponse])
async def get_articles(category: str = None, db: AsyncSession = Depends(get_db)):
    query = select(Article).where(Article.is_published == True)
    if category:
        query = query.where(Article.category == category)
    result = await db.execute(query.order_by(Article.created_at.desc()))
    return result.scalars().all()

@router.get("/articles/{identifier}", response_model=ArticleResponse)
async def get_article(identifier: str, db: AsyncSession = Depends(get_db)):
    # Try searching by UUID first
    try:
        val = uuid.UUID(identifier)
        query = select(Article).where(Article.id == val)
    except ValueError:
        # If not a UUID, search by slug
        query = select(Article).where(Article.slug == identifier)
        
    result = await db.execute(query)
    article = result.scalars().first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@router.post("/bookmarks/{article_id}")
async def toggle_bookmark(
    article_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Bookmark).where(Bookmark.user_id == current_user.id, Bookmark.article_id == article_id)
    )
    bookmark = result.scalars().first()
    
    if bookmark:
        await db.delete(bookmark)
        await db.commit()
        return {"message": "Bookmark removed"}
    else:
        new_bookmark = Bookmark(user_id=current_user.id, article_id=article_id)
        db.add(new_bookmark)
        await db.commit()
        return {"message": "Bookmark added"}

@router.get("/bookmarks", response_model=list[ArticleResponse])
async def get_bookmarks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Article).join(Bookmark).where(Bookmark.user_id == current_user.id)
    )
    return result.scalars().all()

@router.get("/daily-tip", response_model=OralHealthTipResponse)
async def get_daily_tip(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OralHealthTip))
    tips = result.scalars().all()
    if not tips:
        raise HTTPException(status_code=404, detail="No tips found")
    return random.choice(tips)
