from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.core.database import get_db
from app.models.chat import Conversation, Message
from app.models.user import User
from app.schemas.chat import MessageCreate, ConversationResponse
from app.dependencies import get_current_user
from app.services.ai_service import stream_chat_response
from app.core.limiter import limiter
import uuid
import re
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["chat"])

def sanitize_chat_message(content: str) -> str:
    """Sanitize and normalize user messages to prevent prompt injection payload persistence."""
    # Normalize whitespaces
    content = " ".join(content.strip().split())
    # Identify high-risk prompt injection override instructions
    injection_patterns = [
        r"(?i)ignore\s+(?:all\s+)?prior\s+instructions",
        r"(?i)ignore\s+(?:all\s+)?previous\s+instructions",
        r"(?i)system\s+prompt\s+override",
        r"(?i)override\s+system\s+instructions",
        r"(?i)you\s+must\s+now\s+act\s+as",
        r"(?i)disregard\s+(?:all\s+)?instructions",
        r"(?i)new\s+system\s+role",
    ]
    for pattern in injection_patterns:
        content = re.sub(pattern, "[removed instruction override attempt]", content)
    return content

@router.post("/message")
async def send_message(
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    # Sanitize message at route entry point
    sanitized_msg = sanitize_chat_message(req.message)

    conv_id = req.conversation_id
    if not conv_id:
        # Retention / storage growth abuse limit: Enforce maximum conversation limit (20)
        conv_count = await db["conversations"].count_documents({"user_id": str(current_user.id), "is_deleted": False})
        if conv_count >= 20:
            raise HTTPException(
                status_code=400,
                detail="Maximum conversation limit reached (20). Please delete an existing conversation before starting a new one."
            )
        conv_id = uuid.uuid4()
        new_conv = Conversation(
            id=conv_id,
            user_id=current_user.id,
            title=sanitized_msg[:50]
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
        
        # Enforce maximum messages limit per conversation (50)
        msg_count = await db["messages"].count_documents({"conversation_id": str(uuid.UUID(str(conv_id)))})
        if msg_count >= 50:
            raise HTTPException(
                status_code=400,
                detail="Message limit reached for this conversation (50). Please start a new conversation."
            )
            
    # Save user message
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=sanitized_msg
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
        # CRITICAL: Validate SSE format and schemas strictly. Halt stream on any error/malformation.
        async for chunk in stream_chat_response(sanitized_msg, prior_history): 
            if "data: [DONE]" in chunk:
                yield chunk
                continue

            if not chunk.startswith("data: "):
                # Stream corruption: yield safe error and terminate
                yield f"data: {json.dumps({'token': 'AI response format error.'})}\n\n"
                yield "data: [DONE]\n\n"
                break

            clean_chunk = chunk.replace("data: ", "").strip()
            try:
                data = json.loads(clean_chunk)
                if "error" in data:
                    yield f"data: {json.dumps({'token': 'AI provider service error.'})}\n\n"
                    yield "data: [DONE]\n\n"
                    break
                
                # Check for schema conformity
                token = data.get("token") or data.get("content")
                if token is None:
                    yield f"data: {json.dumps({'token': 'AI invalid payload format.'})}\n\n"
                    yield "data: [DONE]\n\n"
                    break

                full_response += token
                yield f"data: {json.dumps({'token': token})}\n\n"
            except (json.JSONDecodeError, KeyError, TypeError):
                # Fail-closed: yield generic token on parse failure and terminate
                yield f"data: {json.dumps({'token': 'AI response streaming failure.'})}\n\n"
                yield "data: [DONE]\n\n"
                break
            
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


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    # Enforce strict ownership check in the same query (IDOR Prevention)
    conv_doc = await db["conversations"].find_one({
        "_id": str(conversation_id),
        "user_id": str(current_user.id),
        "is_deleted": False
    })
    if not conv_doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    await db["conversations"].update_one(
        {"_id": str(conversation_id)},
        {"$set": {"is_deleted": True}}
    )
    return {"message": "Conversation deleted successfully"}
