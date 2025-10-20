import sys
import asyncio
import uvicorn

def setup_event_loop():
    """Setup proper event loop policy for Windows"""
    if sys.platform == "win32":
        # Set the event loop policy to ProactorEventLoopPolicy for Windows
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        # Create and set a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        print("Windows ProactorEventLoopPolicy set successfully")
    else:
        print("Non-Windows platform detected, using default event loop policy")

def run_server():
    """Run the FastAPI server with proper event loop setup"""
    setup_event_loop()
    
    # Import your main app after setting up the event loop
    from endpoints import app
    
    # Run the server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        loop="asyncio",
        log_level="info",
        
    )

if __name__ == "__main__":
    run_server()