from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import AsyncOpenAI
import os
import json
import pandas as pd
import re

# Load environment variables from .env
load_dotenv()

# Initialize OpenAI client with API key
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
        response = await client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Generate synthetic data in valid JSON format:\n"
                        f"{data_request.prompt}"
                    ),
                }
            ],
            temperature=0.7,
        )

        # Extract the model response content
        content = response.choices[0].message.content
        data = extract_json(content)

        if data_request.format == "csv":
            df = pd.DataFrame(data)
            return {"csv": df.to_csv(index=False)}

        return {"json": data}

    except Exception as e:
        return {"error": str(e)}


def extract_json(content):
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        array_match = re.search(r"\[.*\]", content, re.DOTALL)
        if array_match:
            parsed = json.loads(array_match.group(0))
        else:
            object_match = re.search(
                r"\{.*\}", content, re.DOTALL
            )
            if not object_match:
                raise ValueError(
                    "Response did not contain valid JSON"
                )
            parsed = json.loads(object_match.group(0))

    if isinstance(parsed, dict) and "rows" in parsed:
        rows = parsed["rows"]
    else:
        rows = parsed

    if not isinstance(rows, list):
        raise ValueError(
            "Response JSON must include an array of rows"
        )

    for idx, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"Row {idx} must be an object")

    return rows
