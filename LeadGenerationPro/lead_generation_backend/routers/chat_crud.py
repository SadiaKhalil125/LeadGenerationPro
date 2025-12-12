from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from models import MessageRequest, MessageResponse
from typing import List
from routers.chat_service import generate_response
from routers.chat_repository import save_message, get_history, clear_session

# --- Auth Dependency Setup ---
from .auth import SECRET_KEY, ALGORITHM # Import from your auth.py

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user_id(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# --- Routes ---
router = APIRouter()

@router.post("/chat", response_model=MessageResponse)
def chat_endpoint(request: MessageRequest, user_id: int = Depends(get_current_user_id)):
    """
    We remove session_id from the URL. 
    We generate a consistent session ID for the user (e.g., 'user_123_default')
    so they always see their own history.
    """
    # Create a persistent session ID for this user
    session_id = f"user_{user_id}_default"
    
    # 1. Save User Message (linked to user_id)
    user_save_result = save_message(session_id, user_id, "user", request.text)
    
    # 2. Fetch History
    history = get_history(session_id, user_id)
    
    # 3. Generate AI Response
    bot_text = generate_response(request.text, history)
    
    # 4. Save Bot Message
    bot_save_result = save_message(session_id, user_id, "bot", bot_text)
    
    return {
        "id": bot_save_result[0],
        "sender": "bot",
        "text": bot_text,
        "timestamp": str(bot_save_result[1])
    }

@router.get("/history", response_model=List[MessageResponse])
def get_history_endpoint(user_id: int = Depends(get_current_user_id)):
    session_id = f"user_{user_id}_default"
    
    raw_history = get_history(session_id, user_id)
    
    formatted_history = []
    for msg in raw_history:
        formatted_history.append({
            "id": msg['id'],
            "sender": msg['sender'],
            "text": msg['content'],
            "timestamp": str(msg['timestamp'])
        })
    return formatted_history

@router.delete("/delete_session")
def delete_session_endpoint(user_id: int = Depends(get_current_user_id)):
    session_id = f"user_{user_id}_default"
    clear_session(session_id, user_id)
    return {"status": "success", "message": "Session deleted"}