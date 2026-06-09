from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.chat import Conversation, Message
from app.models.user import User
from app.schemas.chat import MessageCreate, ConversationResponse
from app.dependencies import get_current_user
from app.services.ai_service import stream_chat_response
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/message")
async def send_message(
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    conv_id = req.conversation_id
    if not conv_id:
        new_conv = Conversation(user_id=current_user.id, title=req.message[:50])
        db.add(new_conv)
        await db.flush()
        conv_id = new_conv.id
    
    # Save user message
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=req.message
    )
    db.add(user_msg)
    await db.commit()
    
    # Fetch history
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
        .limit(20)
    )
    history = result.scalars().all()
    
    # Stream AI response
    async def generator():
        import json
        yield f"data: {json.dumps({'conversation_id': str(conv_id)})}\n\n"
        
        full_response = ""
        async for chunk in stream_chat_response(req.message, history[:-1]): # Exclude the user message we just saved from history as it's passed separately
            # Parse chunk if it's not [DONE] and build full response to save
            if "data: [DONE]" not in chunk:
                try:
                    data = json.loads(chunk.replace("data: ", ""))
                    if "token" in data:
                        full_response += data["token"]
                except:
                    pass
            yield chunk
            
        # Save assistant message using a new session to prevent "session is closed" errors
        if full_response:
            from app.core.database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                ai_msg = Message(
                    conversation_id=conv_id,
                    role="assistant",
                    content=full_response
                )
                session.add(ai_msg)
                await session.commit()
            
    headers = {
        "X-Conversation-Id": str(conv_id),
        "Access-Control-Expose-Headers": "X-Conversation-Id"
    }
    return StreamingResponse(generator(), headers=headers, media_type="text/event-stream")

@router.get("/conversations", response_model=list[ConversationResponse])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.user_id == current_user.id, Conversation.is_deleted == False)
        .order_by(Conversation.created_at.desc())
    )
    return result.scalars().all()

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id, Conversation.is_deleted == False)
    )
    conversation = result.scalars().first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation
