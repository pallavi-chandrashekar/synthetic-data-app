from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
import os
import json
import pandas as pd
import re

# Load environment variables from .env
load_dotenv()

# Initialize OpenAI client with API key
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize FastAPI app
app = FastAPI()

# CORS config for frontend (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request payload schema
class DataRequest(BaseModel):
    prompt: str
    format: str = "json"  # or "csv"

# POST endpoint to generate synthetic data
@app.post("/generate-data")
async def generate_data(data_request: DataRequest):
    try:
        # Call OpenAI ChatCompletion API
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "user",
                    "content": f"Generate synthetic data in valid JSON format:\n{data_request.prompt}"
                }
            ],
            temperature=0.7,
        )

        # Extract the model response content
        content = response.choices[0].message.content
        data = extract_json(content)

        # Format response as CSV or JSON
        if data_request.format == "csv":
            df = pd.DataFrame(data)
            return {"csv": df.to_csv(index=False)}

        return {"json": data}

    except Exception as e:
        return {"error": str(e)}
    
def extract_json(content):
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\[.*\]", content, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise