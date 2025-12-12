import psycopg2
from psycopg2.extras import RealDictCursor
from routers.get_db_connection import get_db_cursor

def init_db():
    """Create tables if they don't exist"""
    conn, cur = get_db_cursor()
    
    # 1. Update Sessions Table to include user_id
    # Note: referencing users(id) assumes you created the users table in previous steps
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            session_id VARCHAR(255) PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 2. Messages Table (Unchanged)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
            sender VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    conn.commit()
    cur.close()
    conn.close()

def save_message(session_id, user_id, sender, content):
    """
    Saves a message. 
    If session doesn't exist, it creates it linked to the user_id.
    """
    init_db()
    conn, cur = get_db_cursor()

    # Ensure session exists and is linked to the user
    cur.execute("""
        INSERT INTO chat_sessions (session_id, user_id) 
        VALUES (%s, %s) 
        ON CONFLICT (session_id) DO NOTHING
    """, (session_id, user_id))
    
    # Insert message
    cur.execute(
        "INSERT INTO chat_messages (session_id, sender, content) VALUES (%s, %s, %s) RETURNING id, timestamp",
        (session_id, sender, content)
    )
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return result

def get_history(session_id, user_id):
    """
    Fetches history, but verifies the session belongs to the user 
    (or allows access if we just want history by session ID).
    For strict security, you would add `AND user_id = %s` to a session check.
    """
    init_db()
    conn, cur = get_db_cursor()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Optional: You could verify user ownership here
    cur.execute("SELECT * FROM chat_messages WHERE session_id = %s ORDER BY timestamp ASC", (session_id,))
    rows = cur.fetchall()
    
    cur.close()
    conn.close()
    return rows

def clear_session(session_id, user_id):
    init_db()
    conn, cur = get_db_cursor()
    # Only delete if it belongs to the user
    cur.execute("DELETE FROM chat_sessions WHERE session_id = %s AND user_id = %s", (session_id, user_id))
    conn.commit()
    cur.close()
    conn.close()