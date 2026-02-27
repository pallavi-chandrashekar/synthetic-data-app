import pytest
from fastapi.testclient import TestClient
from main import app, extract_json

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "checks": {"api_key_configured": "pass"},
    }


def test_health_deep_success(monkeypatch):
    async def mock_models_list(*args, **kwargs):
        return []

    monkeypatch.setattr("main.client.models.list", mock_models_list)
    response = client.get("/health", params={"deep": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["checks"]["openai_reachable"] == "pass"


def test_health_deep_failure(monkeypatch):
    async def mock_models_list(*args, **kwargs):
        raise Exception("Connection refused")

    monkeypatch.setattr("main.client.models.list", mock_models_list)
    response = client.get("/health", params={"deep": "true"})
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "degraded"
    assert data["checks"]["openai_reachable"] == "fail"


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


def test_extract_json_prefers_array():
    content = (
        'Wrapper {"note": "ignored"} and array:' ' [{"c": 1}, {"c": 2}] trailing text'
    )
    result = extract_json(content)
    assert isinstance(result, list)
    assert result[0]["c"] == 1


def test_extract_json_invalid_raises():
    with pytest.raises(ValueError):
        extract_json("no json here")


def test_extract_json_non_list_raises():
    with pytest.raises(ValueError):
        extract_json('{"rows": "not a list"}')


def test_extract_json_non_dict_row_raises():
    with pytest.raises(ValueError):
        extract_json("[1, 2, 3]")


def test_extract_json_deeply_nested_no_hang():
    """Input that would cause catastrophic backtracking with the old regex."""
    nested = '{"rows": [' + '{"a": {"b": {"c": 1}}},' * 200 + '{"a": {"b": {"c": 2}}}]}'
    result = extract_json(nested)
    assert len(result) == 201
    assert result[-1]["a"]["b"]["c"] == 2


@pytest.mark.parametrize(
    "format_type,expected_key",
    [("json", "json"), ("csv", "csv")],
)
def test_generate_data(monkeypatch, format_type, expected_key):
    async def mock_openai(prompt):
        return '{"rows": [{"x": 1}, {"x": 2}]}'

    monkeypatch.setattr(
        "main.request_dataset_from_openai",
        mock_openai,
    )
    payload = {
        "prompt": "2 rows of x",
        "format": format_type,
    }
    response = client.post("/generate-data", json=payload)
    assert response.status_code == 200
    assert expected_key in response.json()


def test_generate_data_error(monkeypatch):
    async def mock_raise(prompt):
        raise ValueError("API error")

    monkeypatch.setattr("main.request_dataset_from_openai", mock_raise)
    payload = {"prompt": "fail", "format": "json"}
    response = client.post("/generate-data", json=payload)
    assert response.status_code == 502
    assert response.json()["detail"] == "API error"


def test_generate_data_empty_prompt():
    payload = {"prompt": "", "format": "json"}
    response = client.post("/generate-data", json=payload)
    assert response.status_code == 422


def test_generate_data_prompt_too_long():
    payload = {
        "prompt": "x" * 3000,
        "format": "json",
    }
    response = client.post("/generate-data", json=payload)
    assert response.status_code == 422
