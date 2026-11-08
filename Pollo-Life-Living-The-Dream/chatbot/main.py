import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI()

# Allow browser requests from any local origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
# Option A: NVIDIA NIM Cloud API
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ["NVIDIA_API_KEY"],
)
MODEL_NAME = "nvidia/nemotron-3.5-bolt-e4b"

# Option B: Uncomment below if using local Ollama instead
# client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
# MODEL_NAME = "nemotron-mini"

class ChatRequest(BaseModel):
    messages: list[dict]

# Serve the frontend directly at http://127.0.0.1:8000/
@app.get("/")
def serve_home():
    return FileResponse("index.html")

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=request.messages,
            temperature=0.6,
            max_tokens=1024,
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
