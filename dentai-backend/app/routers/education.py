from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.models.education import Article, Bookmark, OralHealthTip
from app.models.user import User
from app.schemas.education import ArticleResponse, OralHealthTipResponse
from app.dependencies import get_current_user
import uuid
import random

router = APIRouter(prefix="/education", tags=["education"])

@router.get("/articles", response_model=list[ArticleResponse])
async def get_articles(category: str = None, db = Depends(get_db)):
    filter_query = {"is_published": True}
    if category:
        filter_query["category"] = category
        
    art_cursor = db["articles"].find(filter_query).sort("created_at", -1)
    articles = []
    async for art_doc in art_cursor:
        articles.append({
            "id": art_doc["_id"],
            "title": art_doc["title"],
            "slug": art_doc["slug"],
            "content": art_doc["content"],
            "category": art_doc["category"],
            "thumbnail_url": art_doc.get("thumbnail_url"),
            "read_time_minutes": art_doc.get("read_time_minutes", 5),
            "author": art_doc.get("author"),
            "is_published": art_doc["is_published"],
            "created_at": art_doc["created_at"]
        })
    return articles

@router.get("/articles/{identifier}", response_model=ArticleResponse)
async def get_article(identifier: str, db = Depends(get_db)):
    # Try searching by UUID first
    try:
        val = uuid.UUID(identifier)
        query = {"_id": str(val)}
    except ValueError:
        # If not a UUID, search by slug
        query = {"slug": identifier}
        
    art_doc = await db["articles"].find_one(query)
    if not art_doc:
        raise HTTPException(status_code=404, detail="Article not found")
        
    return {
        "id": art_doc["_id"],
        "title": art_doc["title"],
        "slug": art_doc["slug"],
        "content": art_doc["content"],
        "category": art_doc["category"],
        "thumbnail_url": art_doc.get("thumbnail_url"),
        "read_time_minutes": art_doc.get("read_time_minutes", 5),
        "author": art_doc.get("author"),
        "is_published": art_doc["is_published"],
        "created_at": art_doc["created_at"]
    }

@router.post("/bookmarks/{article_id}")
async def toggle_bookmark(
    article_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    query = {
        "user_id": str(current_user.id),
        "article_id": str(article_id)
    }
    bookmark = await db["bookmarks"].find_one(query)
    
    if bookmark:
        await db["bookmarks"].delete_one(query)
        return {"message": "Bookmark removed"}
    else:
        new_bookmark = Bookmark(user_id=current_user.id, article_id=article_id)
        await db["bookmarks"].insert_one(new_bookmark.to_dict())
        return {"message": "Bookmark added"}

@router.get("/bookmarks", response_model=list[ArticleResponse])
async def get_bookmarks(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    bm_cursor = db["bookmarks"].find({"user_id": str(current_user.id)})
    article_ids = []
    async for bm_doc in bm_cursor:
        article_ids.append(bm_doc["article_id"])
        
    if not article_ids:
        return []
        
    art_cursor = db["articles"].find({"_id": {"$in": article_ids}})
    articles = []
    async for art_doc in art_cursor:
        articles.append({
            "id": art_doc["_id"],
            "title": art_doc["title"],
            "slug": art_doc["slug"],
            "content": art_doc["content"],
            "category": art_doc["category"],
            "thumbnail_url": art_doc.get("thumbnail_url"),
            "read_time_minutes": art_doc.get("read_time_minutes", 5),
            "author": art_doc.get("author"),
            "is_published": art_doc["is_published"],
            "created_at": art_doc["created_at"]
        })
    return articles

@router.get("/daily-tip", response_model=OralHealthTipResponse)
async def get_daily_tip(db = Depends(get_db)):
    tip_cursor = db["oral_health_tips"].find({})
    tips = []
    async for tip_doc in tip_cursor:
        tips.append({
            "id": tip_doc["_id"],
            "tip_text": tip_doc["tip_text"],
            "category": tip_doc.get("category")
        })
        
    if not tips:
        raise HTTPException(status_code=404, detail="No tips found")
    return random.choice(tips)
