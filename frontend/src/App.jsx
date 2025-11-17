import { useMemo, useState, useRef } from "react";
import axios from "axios";
import Papa from "papaparse";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Snackbar,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import MuiAlert from "@mui/material/Alert";
import DataTable from "./DataTable";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const SAMPLE_PROMPTS = [
  "Generate 50 fake customer profiles with fields: name, email, age, country",
  "Generate 100 sales records with product, quantity, revenue, and date",
  "Generate a dataset of employee records with id, name, role, and joining_date",
  "Generate 25 SaaS subscriptions with plan_name, mrr, user_count, and status",
];

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

function App() {
  const [prompt, setPrompt] = useState("");
  const [dataset, setDataset] = useState(null);
  const [format, setFormat] = useState("json");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("promptHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);
  const [cache, setCache] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState(null);
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

  const savePromptToHistory = (prompt) => {
    if (!history.includes(prompt)) {
      const newHistory = [prompt, ...history.slice(0, 9)];
      setHistory(newHistory);
      localStorage.setItem("promptHistory", JSON.stringify(newHistory));
    }
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    const key = `${trimmedPrompt}__${format}`;

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
        prompt: trimmedPrompt,
        format,
      });
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
  };

  const handleHistoryClick = (item) => {
    setPrompt(item);
  };

  const handleDeletePrompt = () => {
    const updated = history.filter(p => p !== promptToDelete);
    setRecentlyDeleted(promptToDelete);
    setHistory(updated);
    localStorage.setItem("promptHistory", JSON.stringify(updated));
    setSnackbar({ open: true, message: `Prompt "${promptToDelete}" deleted`, severity: "info" });
    setDeleteDialogOpen(false);
    setPromptToDelete(null);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setRecentlyDeleted(null);
    localStorage.removeItem("promptHistory");
    setSnackbar({ open: true, message: "Prompt history cleared", severity: "info" });
  };


  const openDeleteDialog = (prompt) => {
    setPromptToDelete(prompt);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setPromptToDelete(null);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Synthetic Data Generator
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <Select value={format} onChange={(e) => setFormat(e.target.value)} size="small">
          <MenuItem value="json">JSON</MenuItem>
          <MenuItem value="csv">CSV</MenuItem>
        </Select>
        <Button variant="contained" onClick={handleGenerate} disabled={loading}>
          Generate
        </Button>
        <Button
          variant="outlined"
          onClick={handleDownload}
          disabled={!dataset || dataset.format !== format}
          startIcon={<DownloadIcon />}
        >
          Download {format.toUpperCase()}
        </Button>
      </Box>
      <TextField
        label="Prompt"
        multiline
        fullWidth
        minRows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        sx={{ mb: 3 }}
        placeholder="e.g. Generate 20 sample users with name, email, and signup date"
      />

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
        {SAMPLE_PROMPTS.map((example) => (
          <Chip
            key={example}
            label={example}
            size="small"
            variant={prompt === example ? "filled" : "outlined"}
            onClick={() => setPrompt(example)}
          />
        ))}
      </Box>

      {history.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6">
              Prompt History
            </Typography>
            <Button size="small" onClick={handleClearHistory} disabled={history.length === 0}>
              Clear History
            </Button>
          </Box>
          {history.map((item, idx) => (
            <Box
              key={idx}
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}
            >
              <Button variant="text" onClick={() => handleHistoryClick(item)}>{item}</Button>
              <IconButton color="error" onClick={() => openDeleteDialog(item)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Paper>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {dataset?.table && !loading && (
        <Box ref={tableRef}>
          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
            Generated Data
          </Typography>
          {datasetSummary && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {datasetSummary.rows} rows · {datasetSummary.columns} columns · {datasetSummary.format.toUpperCase()}
            </Alert>
          )}
          <DataTable data={dataset.table} />
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity={snackbar.severity}
          action={
            recentlyDeleted ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  const restored = [recentlyDeleted, ...history];
                  setHistory(restored);
                  localStorage.setItem("promptHistory", JSON.stringify(restored));
                  setSnackbar({
                    open: true,
                    message: `Prompt "${recentlyDeleted}" restored`,
                    severity: "success",
                  });
                  setRecentlyDeleted(null);
                }}
              >
                UNDO
              </Button>
            ) : null
          }
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Delete Prompt</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the prompt "{promptToDelete}" from history?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button color="error" onClick={handleDeletePrompt}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App;
