import logging
import uuid
import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.education import Bookmark
from app.models.user import User
from app.schemas.education import ArticleResponse, OralHealthTipResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/education", tags=["education"])

# SECURITY: Category values are validated against an allow-list to prevent
# arbitrary strings from reaching the database query.
ALLOWED_CATEGORIES = {
    "hygiene", "nutrition", "procedures", "paediatric",
    "orthodontics", "cosmetic", "general", "emergency",
}


@router.get("/articles", response_model=list[ArticleResponse])
async def get_articles(
    category: Optional[str] = None,
    db=Depends(get_db),
    # SECURITY: require authentication so unauthenticated callers cannot probe
    # article existence or scrape content.
    current_user: User = Depends(get_current_user),
):
    filter_query: dict = {"is_published": True}

    if category is not None:
        # SECURITY: allow-list validation — reject unknown categories
        clean_cat = category.strip().lower()
        if clean_cat not in ALLOWED_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Must be one of: {sorted(ALLOWED_CATEGORIES)}",
            )
        filter_query["category"] = clean_cat

    art_cursor = db["articles"].find(filter_query).sort("created_at", -1)
    articles = []
    async for art_doc in art_cursor:
        articles.append(_map_article(art_doc))
    return articles


@router.get("/articles/{identifier}", response_model=ArticleResponse)
async def get_article(
    identifier: str,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        val = uuid.UUID(identifier)
        query: dict = {"_id": str(val), "is_published": True}
    except ValueError:
        # slug — sanitise to safe characters only
        if not identifier.replace("-", "").replace("_", "").isalnum():
            raise HTTPException(status_code=400, detail="Invalid article identifier.")
        query = {"slug": identifier, "is_published": True}

    art_doc = await db["articles"].find_one(query)
    if not art_doc:
        raise HTTPException(status_code=404, detail="Article not found")

    return _map_article(art_doc)


@router.post("/bookmarks/{article_id}")
async def toggle_bookmark(
    article_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    # Enforce check that article exists and is published before toggling bookmark
    art_doc = await db["articles"].find_one({"_id": str(article_id), "is_published": True})
    if not art_doc:
        raise HTTPException(status_code=404, detail="Article not found")

    query = {"user_id": str(current_user.id), "article_id": str(article_id)}
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
    db=Depends(get_db),
):
    bm_cursor = db["bookmarks"].find({"user_id": str(current_user.id)})
    article_ids = []
    async for bm_doc in bm_cursor:
        article_ids.append(str(uuid.UUID(str(bm_doc["article_id"]))))

    if not article_ids:
        return []

    # Only load bookmarks for articles that exist and are published
    art_cursor = db["articles"].find({"_id": {"$in": article_ids}, "is_published": True})
    articles = []
    async for art_doc in art_cursor:
        articles.append(_map_article(art_doc))
    return articles


@router.get("/daily-tip", response_model=OralHealthTipResponse)
async def get_daily_tip(
    db=Depends(get_db),
    # Remove authentication requirement - tips are public educational content
):
    tip_cursor = db["oral_health_tips"].find({})
    tips = []
    async for tip_doc in tip_cursor:
        tips.append(
            {
                "id": tip_doc["_id"],
                "tip_text": tip_doc["tip_text"],
                "category": tip_doc.get("category"),
            }
        )

    if not tips:
        raise HTTPException(status_code=404, detail="No tips found")
    return random.choice(tips)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _map_article(art_doc: dict) -> dict:
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
        "created_at": art_doc["created_at"],
    }
