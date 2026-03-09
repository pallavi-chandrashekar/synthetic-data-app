import { useState, useCallback } from "react";
import { safePersist, safeRead } from "../utils/storage";

const STORAGE_KEY = "apiKeys";
const DEFAULTS = { openai: "", anthropic: "", google: "" };

const HEADER_MAP = {
  openai: "X-OpenAI-API-Key",
  anthropic: "X-Anthropic-API-Key",
  google: "X-Google-API-Key",
};

export default function useApiKeys() {
  const [apiKeys, setApiKeys] = useState(() => safeRead(STORAGE_KEY, DEFAULTS));

  const updateKey = useCallback((provider, value) => {
    setApiKeys((prev) => {
      const next = { ...prev, [provider]: value };
      safePersist(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const clearKeys = useCallback(() => {
    setApiKeys(DEFAULTS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getHeaders = useCallback(() => {
    const headers = {};
    for (const [provider, headerName] of Object.entries(HEADER_MAP)) {
      const key = apiKeys[provider]?.trim();
      if (key) {
        headers[headerName] = key;
      }
    }
    return headers;
  }, [apiKeys]);

  return { apiKeys, updateKey, clearKeys, getHeaders };
}
