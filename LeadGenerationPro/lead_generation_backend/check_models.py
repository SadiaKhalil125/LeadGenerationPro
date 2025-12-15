import google.generativeai as genai
import os

# Paste your API Key here
GOOGLE_API_KEY = "AIzaSyC__oVeUk8rHEn2T2Ty8ztCkrURSoTv_lM"

genai.configure(api_key=GOOGLE_API_KEY)

print("------------------------------------------------")
print("SEARCHING FOR AVAILABLE MODELS FOR YOUR KEY...")
print("------------------------------------------------")

try:
    count = 0
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ AVAILABLE: {m.name}")
            count += 1
    
    if count == 0:
        print("❌ No models found. Check if your API Key is valid and has 'Generative Language API' enabled in Google Cloud Console.")
        
except Exception as e:
    print(f"❌ Error: {e}")