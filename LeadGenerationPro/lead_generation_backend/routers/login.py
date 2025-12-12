from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from .get_db_connection import get_db_cursor
from .auth import hash_password, verify_password, create_access_token
from models import UserSignup, UserLogin

router = APIRouter()

# CREATE USERS TABLE
def create_users_table():
    try:
        conn, cur = get_db_cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(200) NOT NULL
            )
        """)
        conn.commit()
        conn.close()
        print("✅ Users table ensured.")
    except Exception as e:
        print("Error creating users table:", e)


# ... (create_users_table remains the same) ...

@router.post("/signup", tags=["Authentication"])
def signup(user: UserSignup):
    try:
        conn, cur = get_db_cursor()

        # Check if email already exists
        cur.execute("SELECT id FROM users WHERE email=%s", (user.email,))
        if cur.fetchone():
            conn.close() # Ensure connection is closed before raising
            raise HTTPException(status_code=400, detail="Email already exists")

        # Hash the password
        hashed_password = hash_password(user.password)

        # Insert user (Ensure frontend sends 'full_name' to match model)
        cur.execute(
            "INSERT INTO users(full_name, email, password) VALUES (%s, %s, %s) RETURNING id",
            (user.full_name, user.email, hashed_password)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        conn.close()

        token = create_access_token({"user_id": user_id, "email": user.email})

        return {"status": "success", "token": token, "user": {"id": user_id, "name": user.full_name, "email": user.email}}

    except HTTPException:
        raise
    except Exception as e:
        print("Signup error:", e)
        raise HTTPException(status_code=500, detail=str(e)) # Returning str(e) helps debugging


@router.post("/login", tags=["Authentication"])
def login(user: UserLogin):
    try:
        conn, cur = get_db_cursor()

        cur.execute("SELECT id, full_name, password FROM users WHERE email=%s", (user.email,))
        row = cur.fetchone()
        conn.close() # Close connection early

        if not row:
            raise HTTPException(status_code=400, detail="Invalid email or password")

        user_id, full_name, hashed = row

        if not verify_password(user.password, hashed):
            raise HTTPException(status_code=400, detail="Invalid email or password")

        token = create_access_token({"user_id": user_id, "email": user.email})
        return {"status": "success", "token": token, "user": {"id": user_id, "name": full_name, "email": user.email}}

    except HTTPException:
        raise
    except Exception as e:
        print("Login error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")