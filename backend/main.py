from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import OpenAI
from typing import List, Literal
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


class DataRequest(BaseModel):
    prompt: str = Field(
        ..., min_length=1, description="Prompt describing the dataset to generate"
    )
    format: Literal["json", "csv"] = "json"


DATASET_SCHEMA = {
    "type": "object",
    "properties": {
        "rows": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": {
                    "anyOf": [
                        {"type": "string"},
                        {"type": "number"},
                        {"type": "boolean"},
                        {"type": "null"},
                    ]
                },
            },
        }
    },
    "required": ["rows"],
    "additionalProperties": False,
}


@app.post("/generate-data")
async def generate_data(data_request: DataRequest):
    try:
        content = request_dataset_from_openai(data_request.prompt)
        data = extract_json(content)

        if data_request.format == "csv":
            df = pd.DataFrame(data)
            return {"csv": df.to_csv(index=False)}

        return {"json": data}

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Failed to generate synthetic data") from exc


def request_dataset_from_openai(prompt: str) -> str:
    response = client.responses.create(
        model="gpt-4.1",
        input=(
            "You are a service that produces synthetic tabular data. "
            "Always return a JSON object that matches the provided schema and place all rows "
            "within the `rows` array."
            f"\n\nUser prompt: {prompt}"
        ),
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "synthetic_dataset",
                "schema": DATASET_SCHEMA,
                "strict": True,
            },
        },
        temperature=0.4,
    )

    try:
        first_output = response.output[0]
        first_content = first_output.content[0]
        return first_content.text
    except (AttributeError, IndexError) as exc:
        raise HTTPException(status_code=502, detail="Malformed response from OpenAI") from exc


def extract_json(content: str) -> List[dict]:
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        array_match = re.search(r"\[.*\]", content, re.DOTALL)
        if array_match:
            parsed = json.loads(array_match.group(0))
        else:
            object_match = re.search(r"\{.*\}", content, re.DOTALL)
            if not object_match:
                raise ValueError("Response did not contain valid JSON")
            parsed = json.loads(object_match.group(0))

    if isinstance(parsed, dict) and "rows" in parsed:
        rows = parsed["rows"]
    else:
        rows = parsed

    if not isinstance(rows, list):
        raise ValueError("Response JSON must include an array of rows")

    for idx, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"Row {idx} must be an object")

    return rows
