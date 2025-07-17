import { useState, useEffect, useRef } from "react";
import axios from "axios";
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
  Alert,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import MuiAlert from '@mui/material/Alert';
import DataTable from "./DataTable";

function App() {
  const [prompt, setPrompt] = useState("");
  const [data, setData] = useState(null);
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
      setData(cache[key]);
      setSnackbar({ open: true, message: "Loaded from history", severity: "info" });
      setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/generate-data", {
        prompt: trimmedPrompt,
        format,
      });
      const resultData = res.data.json || res.data.csv;
      setData(resultData);
      setCache((prev) => ({ ...prev, [key]: resultData }));
      savePromptToHistory(trimmedPrompt);
      setSnackbar({ open: true, message: "Data generated successfully", severity: "success" });
      setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    } catch (err) {
      setSnackbar({ open: true, message: "Error generating data", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob(
      [format === "json" ? JSON.stringify(data, null, 2) : data],
      { type: format === "json" ? "application/json" : "text/csv" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synthetic_data.${format}`;
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
        <Button variant="outlined" onClick={handleDownload} disabled={!data} startIcon={<DownloadIcon />}>
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

      {history.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Prompt History
          </Typography>
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

      {data && !loading && (
        <Box ref={tableRef}>
          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
            Generated Data
          </Typography>
          <DataTable data={data} format={format} />
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
