import pytest
from fastapi.testclient import TestClient
from main import app, extract_json

client = TestClient(app)

def test_extract_json_valid():
    content = '[{"a": 1}, {"a": 2}]'
    result = extract_json(content)
    assert isinstance(result, list)
    assert result[0]["a"] == 1

def test_extract_json_with_extra_text():
    content = 'Here is your data: [{"b": 3}, {"b": 4}] End.'
    result = extract_json(content)
    assert isinstance(result, list)
    assert result[1]["b"] == 4

@pytest.mark.parametrize("format_type,expected_key", [("json", "json"), ("csv", "csv")])
def test_generate_data(monkeypatch, format_type, expected_key):
    class DummyResponse:
        class Choices:
            class Message:
                content = '[{"x": 1}, {"x": 2}]'
            message = Message()
        choices = [Choices()]
    class DummyClient:
        class Chat:
            class Completions:
                @staticmethod
                def create(*args, **kwargs):
                    return DummyResponse()
            completions = Completions()
        chat = Chat()
    # Patch OpenAI client in main
    monkeypatch.setattr("main.client", DummyClient())
    payload = {"prompt": "2 rows of x", "format": format_type}
    response = client.post("/generate-data", json=payload)
    assert response.status_code == 200
    assert expected_key in response.json()

def test_generate_data_error(monkeypatch):
    class DummyClient:
        class Chat:
            class Completions:
                @staticmethod
                def create(*args, **kwargs):
                    raise Exception("API error")
            completions = Completions()
        chat = Chat()
    monkeypatch.setattr("main.client", DummyClient())
    payload = {"prompt": "fail", "format": "json"}
    response = client.post("/generate-data", json=payload)
    assert response.status_code == 200
    assert "error" in response.json()
