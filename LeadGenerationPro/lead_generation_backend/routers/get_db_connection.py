from psycopg2 import sql
import os
import psycopg2
import sys
DB_NAME = os.getenv("DB_NAME", "LeadGenerationPro")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "9042c98a")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

def get_db_cursor():
    """Get a fresh database cursor"""
    connection = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        port=DB_PORT
    )
    return connection, connection.cursor()