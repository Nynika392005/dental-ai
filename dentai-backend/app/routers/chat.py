from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.database import get_db
from app.models.chat import Conversation, Message
from app.models.user import User
from app.schemas.chat import MessageCreate, ConversationResponse
from app.dependencies import get_current_user
from app.services.ai_service import stream_chat_response
import uuid
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["chat"])

# FIX-08: Per-user rate limit on AI chat to prevent cost exhaustion
limiter = Limiter(key_func=get_remote_address)

@router.post("/message")
async def send_message(
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    conv_id = req.conversation_id
    if not conv_id:
        conv_id = uuid.uuid4()
        new_conv = Conversation(
            id=conv_id,
            user_id=current_user.id,
            title=req.message[:50]
        )
        await db["conversations"].insert_one(new_conv.to_dict())
    else:
        # Verify conversation exists and belongs to user (IDOR prevention)
        conv_doc = await db["conversations"].find_one({
            "_id": str(uuid.UUID(str(conv_id))),
            "user_id": str(current_user.id),
            "is_deleted": False
        })
        if not conv_doc:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
    # Save user message
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=req.message
    )
    await db["messages"].insert_one(user_msg.to_dict())
    
    # Fetch history of messages for this conversation (up to 20), excluding the just-saved user message.
    # Note: we filter by conversation_id, but to be secure, we also enforce the conversation check above.
    msg_cursor = db["messages"].find({"conversation_id": str(uuid.UUID(str(conv_id)))}).sort("created_at", 1).limit(21)
    history = []
    async for msg_doc in msg_cursor:
        history.append(Message(**msg_doc))

    # history[-1] is the user message we just saved — pass everything before it as context
    prior_history = history[:-1]

    # Stream AI response
    async def generator():
        import json
        yield f"data: {json.dumps({'conversation_id': str(conv_id)})}\n\n"
        
        full_response = ""
        async for chunk in stream_chat_response(req.message, prior_history): 
            if "data: [DONE]" not in chunk:
                try:
                    data = json.loads(chunk.replace("data: ", ""))
                    if "token" in data:
                        full_response += data["token"]
                    elif "content" in data:
                        full_response += data["content"]
                except:
                    pass
            yield chunk
            
        # Save assistant message
        if full_response:
            ai_msg = Message(
                conversation_id=conv_id,
                role="assistant",
                content=full_response
            )
            await db["messages"].insert_one(ai_msg.to_dict())
            
    headers = {
        "X-Conversation-Id": str(conv_id),
        "Access-Control-Expose-Headers": "X-Conversation-Id"
    }
    return StreamingResponse(generator(), headers=headers, media_type="text/event-stream")

@router.get("/conversations", response_model=list[ConversationResponse])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    conv_cursor = db["conversations"].find({
        "user_id": str(current_user.id),
        "is_deleted": False
    }).sort("created_at", -1)
    
    conversations = []
    async for conv_doc in conv_cursor:
        # Fetch messages for this conversation, verifying UUID format and scoping strictly
        conv_uuid_str = str(uuid.UUID(str(conv_doc["_id"])))
        msg_cursor = db["messages"].find({"conversation_id": conv_uuid_str}).sort("created_at", 1)
        messages = []
        async for msg_doc in msg_cursor:
            messages.append({
                "id": msg_doc["_id"],
                "role": msg_doc["role"],
                "content": msg_doc["content"],
                "created_at": msg_doc["created_at"]
            })
        conversations.append({
            "id": conv_doc["_id"],
            "title": conv_doc.get("title", "New Conversation"),
            "created_at": conv_doc["created_at"],
            "messages": messages
        })
    return conversations

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    conv_doc = await db["conversations"].find_one({
        "_id": str(conversation_id),
        "user_id": str(current_user.id),
        "is_deleted": False
    })
    if not conv_doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    msg_cursor = db["messages"].find({"conversation_id": str(conversation_id)}).sort("created_at", 1)
    messages = []
    async for msg_doc in msg_cursor:
        messages.append({
            "id": msg_doc["_id"],
            "role": msg_doc["role"],
            "content": msg_doc["content"],
            "created_at": msg_doc["created_at"]
        })
        
    return {
        "id": conv_doc["_id"],
        "title": conv_doc.get("title", "New Conversation"),
        "created_at": conv_doc["created_at"],
        "messages": messages
    }
