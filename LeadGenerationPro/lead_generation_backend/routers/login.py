from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from .get_db_connection import get_db_cursor
from .auth import hash_password, verify_password, create_access_token

router = APIRouter()


# Pydantic models
class UserSignup(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str


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


# SIGNUP
@router.post("/signup", tags=["Authentication"])
def signup(user: UserSignup):
    try:
        conn, cur = get_db_cursor()

        # Check if email already exists
        cur.execute("SELECT id FROM users WHERE email=%s", (user.email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already exists")

        # Hash the password
        hashed_password = hash_password(user.password)

        # Insert user
        cur.execute(
            "INSERT INTO users(full_name, email, password) VALUES (%s, %s, %s) RETURNING id",
            (user.full_name, user.email, hashed_password)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        conn.close()

        # Generate token
        token = create_access_token({"user_id": user_id, "email": user.email})

        return {"status": "success", "token": token, "user": {"id": user_id, "name": user.full_name, "email": user.email}}

    except HTTPException:
        raise
    except Exception as e:
        print("Signup error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")


# LOGIN
@router.post("/login", tags=["Authentication"])
def login(user: UserLogin):
    try:
        conn, cur = get_db_cursor()

        cur.execute("SELECT id, full_name, password FROM users WHERE email=%s", (user.email,))
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=400, detail="Invalid email or password")

        user_id, full_name, hashed = row

        if not verify_password(user.password, hashed):
            raise HTTPException(status_code=400, detail="Invalid email or password")

        conn.close()

        token = create_access_token({"user_id": user_id, "email": user.email})
        return {"status": "success", "token": token, "user": {"id": user_id, "name": full_name, "email": user.email}}

    except HTTPException:
        raise
    except Exception as e:
        print("Login error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")
# from fastapi import APIRouter, HTTPException
# from contextlib import asynccontextmanager
# from fastapi import FastAPI
# from .get_db_connection import get_db_cursor
# from .auth import hash_password, verify_password, create_access_token

# router = APIRouter()

# def create_users_table():
    
#     conn, cur = get_db_cursor()
#     cur.execute("""
#         CREATE TABLE IF NOT EXISTS users (
#             id SERIAL PRIMARY KEY,
#             full_name VARCHAR(100) NOT NULL,
#             email VARCHAR(100) UNIQUE NOT NULL,
#             password VARCHAR(200) NOT NULL
#         )
#     """)
#     conn.commit()
#     conn.close()



# # SIGNUP 
# @router.post("/signup")
# def signup(full_name: str, email: str, password: str):
#     conn, cur = get_db_cursor()

#     cur.execute("SELECT id FROM users WHERE email=%s", (email,))
#     if cur.fetchone():
#         raise HTTPException(400, "Email already exists")

#     hashed = hash_password(password)

#     cur.execute(
#         "INSERT INTO users(full_name, email, password) VALUES (%s, %s, %s) RETURNING id",
#         (full_name, email, hashed)
#     )
#     user_id = cur.fetchone()[0]
#     conn.commit()
#     conn.close()

#     token = create_access_token({"user_id": user_id, "email": email})

#     return {"status": "success", "token": token, "user": {"id": user_id, "name": full_name, "email": email}}

# # LOGIN 
# @router.post("/login")
# def login(email: str, password: str):
#     conn, cur = get_db_cursor()

#     cur.execute("SELECT id, full_name, password FROM users WHERE email=%s", (email,))
#     row = cur.fetchone()

#     if not row:
#         raise HTTPException(400, "Invalid email or password")

#     user_id, full_name, hashed = row

#     if not verify_password(password, hashed):
#         raise HTTPException(400, "Invalid email or password")

#     conn.close()

#     token = create_access_token({"user_id": user_id, "email": email})

#     return {"status": "success", "token": token, "user": {"id": user_id, "name": full_name, "email": email}}