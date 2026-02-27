import { useMemo, useState, useRef } from "react";
import axios from "axios";
import Papa from "papaparse";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const normalizeDataset = (payload, requestedFormat) => {
  if (requestedFormat === "csv") {
    const csvContent = payload?.csv;
    if (!csvContent) {
      throw new Error("CSV payload missing");
    }
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    if (parsed.errors && parsed.errors.length) {
      throw new Error(parsed.errors[0].message || "Failed to parse CSV payload");
    }
    return { format: "csv", table: parsed.data, raw: csvContent };
  }

  if (!Array.isArray(payload?.json)) {
    throw new Error("JSON payload must be an array");
  }

  return { format: "json", table: payload.json, raw: payload.json };
};

export default function useDataGeneration({ format, rowCount, prompt, setSnackbar, savePromptToHistory }) {
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState({});
  const tableRef = useRef(null);

  const datasetSummary = useMemo(() => {
    if (!dataset?.table || dataset.table.length === 0) {
      return null;
    }
    const columns = new Set();
    dataset.table.forEach((row) => {
      Object.keys(row || {}).forEach((key) => columns.add(key));
    });
    return {
      rows: dataset.table.length,
      columns: columns.size,
      format: dataset.format,
    };
  }, [dataset]);

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    const key = `${trimmedPrompt}__${format}__${rowCount}`;

    if (!trimmedPrompt) return;

    if (cache[key]) {
      setDataset(cache[key]);
      setSnackbar({ open: true, message: "Loaded from history", severity: "info" });
      setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/generate-data`, {
        prompt: `${trimmedPrompt}\n\nGenerate exactly ${rowCount} rows.`,
        format,
      }, { timeout: 30000 });
      const normalized = normalizeDataset(res.data, format);
      setDataset(normalized);
      setCache((prev) => ({ ...prev, [key]: normalized }));
      savePromptToHistory(trimmedPrompt);
      setSnackbar({ open: true, message: "Data generated successfully", severity: "success" });
      setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    } catch (err) {
      const message = err.response?.data?.detail || err.message || "Error generating data";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!dataset || dataset.format !== format) return;
    const blob = new Blob(
      [
        dataset.format === "json"
          ? JSON.stringify(dataset.raw, null, 2)
          : dataset.raw,
      ],
      { type: dataset.format === "json" ? "application/json" : "text/csv" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synthetic_data.${dataset.format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    if (!dataset) return;
    const text =
      dataset.format === "json"
        ? JSON.stringify(dataset.raw, null, 2)
        : dataset.raw;
    try {
      await navigator.clipboard.writeText(text);
      setSnackbar({ open: true, message: "Copied to clipboard", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Failed to copy", severity: "error" });
    }
  };

  const handleRegenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    const key = `${trimmedPrompt}__${format}__${rowCount}`;
    setCache((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/generate-data`, {
        prompt: `${trimmedPrompt}\n\nGenerate exactly ${rowCount} rows.`,
        format,
      }, { timeout: 30000 });
      const normalized = normalizeDataset(res.data, format);
      setDataset(normalized);
      setCache((prev) => ({ ...prev, [key]: normalized }));
      savePromptToHistory(trimmedPrompt);
      setSnackbar({ open: true, message: "Data regenerated", severity: "success" });
      setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    } catch (err) {
      const message = err.response?.data?.detail || err.message || "Error generating data";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return {
    dataset,
    loading,
    cache,
    tableRef,
    datasetSummary,
    handleGenerate,
    handleDownload,
    handleCopyToClipboard,
    handleRegenerate,
  };
}
