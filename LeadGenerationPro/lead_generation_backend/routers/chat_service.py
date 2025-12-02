from google import genai
from google.genai import types
import os

GOOGLE_API_KEY = "AIzaSyDu5DCYOOOFgsE7lR1Q6aJxCIN2LTeW2Is"

client = genai.Client(api_key=GOOGLE_API_KEY)


SYSTEM_INSTRUCTIONS = """
You are a helpful, professional AI Assistant for a Tech Company.
1. Be polite and concise.
2. If the user asks for code, provide Python or JavaScript examples.
3. If you don't know the answer, ask for clarification.
4. Keep the tone helpful and friendly.
"""

def generate_response(current_input, db_history):
    """
    1. Formats DB history into Gemini 2.0 Flash format with streaming.
    2. Sends context + new input to Google AI.
    3. Streams response chunks.
    """
    
    # Convert DB history to Gemini Content format
    history = []
    for msg in db_history:
        role = "user" if msg['sender'] == 'user' else "model"
        history.append(
            types.Content(
                role=role,
                parts=[types.Part(text=msg['content'])]
            )
        )
    
    # Create chat with history
    try:
        chat = client.chats.create(
            model="gemini-2.0-flash",
            history=history
        )
        
        # Send message with streaming
        response = chat.send_message_stream(
            message=current_input
            # system_instruction=SYSTEM_INSTRUCTIONS
        )
        
        # Collect all streamed chunks
        full_response = ""
        for chunk in response:
            if hasattr(chunk, 'text') and chunk.text:
                full_response += chunk.text
        
        return full_response if full_response else "No response generated."
    
    except Exception as e:
        return f"I apologize, but I encountered an error connecting to the AI service: {str(e)}"