from psycopg2 import sql
import os
import psycopg2
import sys
DB_HOST = os.getenv("DB_HOST", "leadgenerationpro.c6teemao2etw.us-east-1.rds.amazonaws.com")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "9042c98a")
# DB_HOST = os.getenv("DB_HOST", "localhost")
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



# import psycopg2
# from sshtunnel import SSHTunnelForwarder

# # --- CONFIGURATION ---
# EC2_PUBLIC_IP = '54.242.35.189'
# EC2_USERNAME = 'ec2-user'
# # IMPORTANT: Use the .pem file, not .ppk
# PATH_TO_PEM_KEY = 'D:\\D downloads\\postgres-key.pem' 
# DB_NAME = 'leadgenerationpro'
# DB_USER = 'postgres'
# DB_PASSWORD = '9042c98a'
# #database-1.c6teemao2etw.us-east-1.rds.amazonaws.com
# # --- GLOBAL VARIABLES ---
# # These will hold our long-lived objects
# ssh_server = None
# db_connection = None

# def start_tunnel_and_connect():
#     """
#     This function starts the tunnel and database connection and stores them globally.
#     Call this ONCE when your application starts.
#     """
#     global ssh_server, db_connection
#     try:
#         print("--- Starting SSH tunnel and DB connection ---")
        
#         # Create the tunnel server object
#         ssh_server = SSHTunnelForwarder(
#             (EC2_PUBLIC_IP, 22),
#             ssh_username=EC2_USERNAME,
#             ssh_pkey=PATH_TO_PEM_KEY,
#             remote_bind_address=('127.0.0.1', 5432)
#         )
        
#         # Start the tunnel (it will run in the background)
#         ssh_server.start()
#         print("✅ SSH tunnel is active.")
        
#         # Connect to the database through the tunnel
#         db_connection = psycopg2.connect(
#             host='127.0.0.1',
#             port=ssh_server.local_bind_port,
#             database=DB_NAME,
#             user=DB_USER,
#             password=DB_PASSWORD
#         )
#         print("✅ Database connection successful!")

#     except Exception as e:
#         print(f"❌ FAILED to start tunnel or connect: {e}")
#         # Clean up if something went wrong
#         stop_tunnel_and_disconnect()

# def stop_tunnel_and_disconnect():
#     """
#     Closes the database connection and stops the tunnel.
#     Call this ONCE when your application is shutting down.
#     """
#     global ssh_server, db_connection
#     print("--- Shutting down connections ---")
#     if db_connection:
#         db_connection.close()
#         print("🔌 DB connection closed.")
#     if ssh_server:
#         ssh_server.stop()
#         print("🔌 SSH tunnel stopped.")

# def get_db_cursor():
#     """
#     This function now just returns a NEW cursor from the EXISTING connection.
#     It no longer manages the tunnel.
#     """
#     if db_connection is None or db_connection.closed:
#         print("Connection is not available. Please start it first.")
#         # In a real app, you might try to reconnect here.
#         # For now, we return None to indicate failure.
#         return None, None

#     # You should not return the connection itself, just the cursor,
#     # and handle commits/rollbacks in the calling function.
#     # Or better, return both but be careful with closing.
#     cursor = db_connection.cursor()
#     return db_connection, cursor
