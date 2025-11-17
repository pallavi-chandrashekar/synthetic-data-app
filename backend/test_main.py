import pytest
from fastapi.testclient import TestClient
from main import app, extract_json

client = TestClient(app)

def test_extract_json_valid():
    content = '[{"a": 1}, {"a": 2}]'
    result = extract_json(content)
    assert isinstance(result, list)
    assert result[0]["a"] == 1

def test_extract_json_with_rows_key():
    content = '{"rows": [{"name": "A"}, {"name": "B"}]}'
    result = extract_json(content)
    assert len(result) == 2
    assert result[1]["name"] == "B"

def test_extract_json_with_extra_text():
    content = 'Here is your data: [{"b": 3}, {"b": 4}] End.'
    result = extract_json(content)
    assert isinstance(result, list)
    assert result[1]["b"] == 4


def test_extract_json_prefers_array_when_both_present():
    content = 'Wrapper {"note": "ignored"} and array: [{"c": 1}, {"c": 2}] trailing text'
    result = extract_json(content)
    assert isinstance(result, list)
    assert result[0]["c"] == 1

@pytest.mark.parametrize("format_type,expected_key", [("json", "json"), ("csv", "csv")])
def test_generate_data(monkeypatch, format_type, expected_key):
    monkeypatch.setattr(
        "main.request_dataset_from_openai",
        lambda prompt: '{"rows": [{"x": 1}, {"x": 2}]}'
    )
    payload = {"prompt": "2 rows of x", "format": format_type}
    response = client.post("/generate-data", json=payload)
    assert response.status_code == 200
    assert expected_key in response.json()

def test_generate_data_error(monkeypatch):
    def _raise(prompt):
        raise ValueError("API error")

    monkeypatch.setattr("main.request_dataset_from_openai", _raise)
    payload = {"prompt": "fail", "format": "json"}
    response = client.post("/generate-data", json=payload)
    assert response.status_code == 502
    assert response.json()["detail"] == "API error"
