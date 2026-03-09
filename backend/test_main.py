import pytest
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from main import (
    app,
    extract_json,
    _providers,
    _cache_key,
    _HEADER_PROVIDER_MAP,
)
from config import Settings

settings = Settings()

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["checks"]["any_provider_configured"] == "pass"


def test_health_deep_success(monkeypatch):
    for name, provider in _providers.items():
        monkeypatch.setattr(provider, "health_check", AsyncMock(return_value=True))
    response = client.get("/health", params={"deep": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    # At least one provider reachable check should be present
    reachable_keys = [k for k in data["checks"] if k.endswith("_reachable")]
    assert len(reachable_keys) > 0
    for key in reachable_keys:
        assert data["checks"][key] == "pass"


def test_health_deep_failure(monkeypatch):
    for name, provider in _providers.items():
        monkeypatch.setattr(
            provider,
            "health_check",
            AsyncMock(side_effect=Exception("Connection refused")),
        )
    response = client.get("/health", params={"deep": "true"})
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "degraded"
    reachable_keys = [k for k in data["checks"] if k.endswith("_reachable")]
    assert len(reachable_keys) > 0
    for key in reachable_keys:
        assert data["checks"][key] == "fail"


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
    # Mock the provider's generate method
    provider = list(_providers.values())[0]
    monkeypatch.setattr(
        provider, "generate", AsyncMock(return_value='{"rows": [{"x": 1}, {"x": 2}]}')
    )
    payload = {
        "prompt": "2 rows of x",
        "format": format_type,
    }
    response = client.post("/generate-data", json=payload)
    assert response.status_code == 200
    assert expected_key in response.json()


def test_generate_data_error(monkeypatch):
    provider = list(_providers.values())[0]
    monkeypatch.setattr(
        provider, "generate", AsyncMock(side_effect=ValueError("API error"))
    )
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


def test_providers_endpoint():
    response = client.get("/providers")
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    assert "default" in data
    assert isinstance(data["providers"], list)
    assert len(data["providers"]) > 0
    assert data["default"] in data["providers"]


def test_invalid_provider():
    payload = {"prompt": "test", "format": "json", "provider": "nonexistent"}
    response = client.post("/generate-data", json=payload)
    assert response.status_code == 400
    assert "nonexistent" in response.json()["detail"]


def test_cache_key_includes_provider():
    key1 = _cache_key("openai", "test prompt")
    key2 = _cache_key("anthropic", "test prompt")
    assert key1 != key2


def test_generate_data_with_user_key_header(monkeypatch):
    """User-supplied API key header overrides server default provider."""
    mock_provider = AsyncMock()
    mock_provider.generate = AsyncMock(return_value='{"rows": [{"id": 1}]}')

    def mock_cls(key, model):
        return mock_provider

    monkeypatch.setitem(
        _HEADER_PROVIDER_MAP,
        "x-openai-api-key",
        ("openai", mock_cls, settings.openai_model),
    )
    response = client.post(
        "/generate-data",
        json={"prompt": "1 row of id", "format": "json"},
        headers={"X-OpenAI-API-Key": "user-test-key"},
    )
    assert response.status_code == 200
    assert response.json()["json"] == [{"id": 1}]
    mock_provider.generate.assert_awaited_once()


def test_providers_endpoint_with_user_keys(monkeypatch):
    """User-supplied key headers add providers to the returned list."""
    mock_provider = AsyncMock()

    def mock_cls(key, model):
        return mock_provider

    monkeypatch.setitem(
        _HEADER_PROVIDER_MAP,
        "x-anthropic-api-key",
        ("anthropic", mock_cls, settings.anthropic_model),
    )
    response = client.get(
        "/providers",
        headers={"X-Anthropic-API-Key": "user-anthropic-key"},
    )
    data = response.json()
    assert "anthropic" in data["providers"]


def test_generate_data_user_key_bypasses_cache(monkeypatch):
    """Server-side cache should be bypassed when a user key is provided."""
    mock_provider = AsyncMock()
    mock_provider.generate = AsyncMock(return_value='{"rows": [{"v": 42}]}')

    def mock_cls(key, model):
        return mock_provider

    monkeypatch.setitem(
        _HEADER_PROVIDER_MAP,
        "x-openai-api-key",
        ("openai", mock_cls, settings.openai_model),
    )
    # First call
    client.post(
        "/generate-data",
        json={"prompt": "cache bypass test", "format": "json"},
        headers={"X-OpenAI-API-Key": "user-key-abc"},
    )
    # Second call with same prompt — should NOT hit cache, so generate is called twice
    client.post(
        "/generate-data",
        json={"prompt": "cache bypass test", "format": "json"},
        headers={"X-OpenAI-API-Key": "user-key-abc"},
    )
    assert mock_provider.generate.await_count == 2
