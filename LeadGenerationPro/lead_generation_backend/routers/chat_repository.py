import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
from routers.get_db_connection import get_db_cursor


def init_db():
    """Create tables if they don't exist"""
    conn,cur = get_db_cursor()
    
    # Create Sessions Table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            session_id VARCHAR(255) PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # Create Messages Table
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

def save_message(session_id, sender, content):
    init_db()
    conn,cur = get_db_cursor()

    # Ensure session exists first
    cur.execute("INSERT INTO chat_sessions (session_id) VALUES (%s) ON CONFLICT (session_id) DO NOTHING", (session_id,))
    
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

def get_history(session_id):
    init_db()  # Ensure tables exist before querying
    conn,cur = get_db_cursor()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM chat_messages WHERE session_id = %s ORDER BY timestamp ASC", (session_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

def clear_session(session_id):
    init_db()  # Ensure tables exist before deleting
    conn,cur = get_db_cursor()
    # Cascading delete will remove messages automatically
    cur.execute("DELETE FROM chat_sessions WHERE session_id = %s", (session_id,))
    conn.commit()
    cur.close()
    conn.close()