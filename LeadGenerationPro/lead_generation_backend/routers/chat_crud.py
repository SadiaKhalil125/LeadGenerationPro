from fastapi import APIRouter
import os
from routers.get_db_connection import get_db_cursor
from models import MessageRequest, MessageResponse
from typing import List
from routers.chat_service import generate_response
from routers.chat_repository import save_message, get_history, init_db,clear_session
router = APIRouter()



@router.post("/chat/{session_id}", response_model=MessageResponse)
def chat_endpoint(session_id: str, request: MessageRequest):
    # 1. Save User Message
    user_save_result = save_message(session_id, "user", request.text)
    
    # 2. Fetch History for Context
    history = get_history(session_id)
    
    # 3. Generate AI Response
    bot_text = generate_response(request.text, history)
    
    # 4. Save Bot Message
    bot_save_result = save_message(session_id, "bot", bot_text)
    
    # 5. Return Bot Message to Frontend
    return {
        "id": bot_save_result[0],
        "sender": "bot",
        "text": bot_text,
        "timestamp": str(bot_save_result[1])
    }

@router.get("/chat/{session_id}/history", response_model=List[MessageResponse])
def get_history_endpoint(session_id: str):
    raw_history = get_history(session_id)
    formatted_history = []
    for msg in raw_history:
        formatted_history.append({
            "id": msg['id'],
            "sender": msg['sender'],
            "text": msg['content'],
            "timestamp": str(msg['timestamp'])
        })
    return formatted_history

@router.delete("/chat/{session_id}")
def delete_session_endpoint(session_id: str):
    clear_session(session_id)
    return {"status": "success", "message": "Session deleted"}