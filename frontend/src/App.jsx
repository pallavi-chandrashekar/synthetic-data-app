import { useMemo, useState, useRef } from "react";
import axios from "axios";
import Papa from "papaparse";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Select,
  Stack,
  Grow,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CelebrationIcon from "@mui/icons-material/Celebration";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
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
  const [colorMode, setColorMode] = useState("light");
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

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: colorMode,
          primary: {
            main: colorMode === "light" ? "#ff6b6b" : "#ff8fb1",
          },
          secondary: {
            main: colorMode === "light" ? "#845ef7" : "#a78bfa",
          },
          background: {
            default: colorMode === "light" ? "#f7f8ff" : "#0b1220",
            paper: colorMode === "light" ? "#ffffff" : "#0f172a",
          },
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      }),
    [colorMode]
  );

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: "blur(12px)",
          backgroundColor:
            colorMode === "light" ? "rgba(255,255,255,0.82)" : "rgba(10,16,30,0.78)",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Synthetic Data Generator
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prompt → preview → filter → download
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={() => setColorMode((prev) => (prev === "light" ? "dark" : "light"))}>
              {colorMode === "light" ? <AutoAwesomeIcon /> : <Brightness7Icon />}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          minHeight: "100vh",
          background:
            colorMode === "light"
              ? "radial-gradient(circle at 15% 20%, rgba(255,119,132,0.18) 0, transparent 28%), radial-gradient(circle at 80% 0%, rgba(132,94,247,0.18) 0, transparent 25%), radial-gradient(circle at 60% 60%, rgba(255,214,102,0.18) 0, transparent 22%), linear-gradient(180deg, #fef9ff 0%, #f6f9ff 40%, #eef2ff 100%)"
              : "radial-gradient(circle at 25% 20%, rgba(255,119,132,0.18) 0, transparent 28%), radial-gradient(circle at 80% 0%, rgba(132,94,247,0.2) 0, transparent 25%), radial-gradient(circle at 60% 60%, rgba(56,189,248,0.15) 0, transparent 22%), linear-gradient(180deg, #050910 0%, #0b1220 40%, #0f172a 100%)",
          pb: 6,
        }}
      >
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Stack spacing={3}>
            <Card elevation={2} sx={{ transition: "transform 150ms ease, box-shadow 150ms ease", "&:hover": { transform: "translateY(-2px)", boxShadow: 8 } }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                  <Select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    size="small"
                    sx={{ width: 140, backgroundColor: "background.paper" }}
                  >
                    <MenuItem value="json">JSON</MenuItem>
                    <MenuItem value="csv">CSV</MenuItem>
                  </Select>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<RocketLaunchIcon />}
                      onClick={handleGenerate}
                      disabled={loading}
                      sx={{
                        textTransform: "none",
                        px: 2.5,
                        boxShadow: "0 10px 30px rgba(255,107,107,0.25)",
                        "&:hover": { transform: "translateY(-1px) scale(1.01)" },
                      }}
                    >
                      Generate
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleDownload}
                      disabled={!dataset || dataset.format !== format}
                      startIcon={<DownloadIcon />}
                      sx={{ textTransform: "none", px: 2.5, "&:hover": { transform: "translateY(-1px) scale(1.01)" } }}
                    >
                      Download {format.toUpperCase()}
                    </Button>
                    <Button
                      variant="text"
                      startIcon={<ShuffleIcon />}
                      onClick={() => {
                        const randomPrompt = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
                        setPrompt(randomPrompt);
                      }}
                      sx={{ textTransform: "none" }}
                    >
                      Random prompt
                    </Button>
                  </Stack>
                </Stack>

                  <TextField
                    label="Prompt"
                    multiline
                    fullWidth
                    minRows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Generate 20 sample users with name, email, and signup date"
                  />

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {SAMPLE_PROMPTS.map((example) => (
                      <Chip
                        key={example}
                        label={example}
                        size="small"
                        variant={prompt === example ? "filled" : "outlined"}
                        onClick={() => setPrompt(example)}
                        icon={<CelebrationIcon fontSize="small" />}
                        sx={{
                          borderRadius: 2,
                          "&:hover": { transform: "translateY(-1px) scale(1.01)" },
                        }}
                      />
                    ))}
                  </Stack>

                  {datasetSummary && (
                    <Grow in timeout={200}>
                      <Alert severity="info" icon={<CelebrationIcon fontSize="small" />}>
                        {datasetSummary.rows} rows · {datasetSummary.columns} columns · {datasetSummary.format.toUpperCase()}
                      </Alert>
                    </Grow>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="stretch">
              <Card sx={{ flex: 1, transition: "transform 150ms ease, box-shadow 150ms ease", "&:hover": { transform: "translateY(-2px)", boxShadow: 8 } }}>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Prompt History</Typography>
                    <Button size="small" onClick={handleClearHistory} disabled={history.length === 0} startIcon={<HistoryIcon />}>
                      Clear History
                    </Button>
                  </Stack>
                  <Divider />
                  {history.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No prompts yet. Generate something to save it.</Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {history.map((item, idx) => (
                        <Stack
                          key={idx}
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Button variant="text" onClick={() => handleHistoryClick(item)} sx={{ textAlign: "left" }}>
                            {item}
                          </Button>
                          <IconButton color="error" onClick={() => openDeleteDialog(item)} size="small">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Stack>

            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {dataset?.table && !loading && (
              <Card ref={tableRef} sx={{ transition: "transform 150ms ease, box-shadow 150ms ease", "&:hover": { transform: "translateY(-2px)", boxShadow: 10 } }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Generated Data
                  </Typography>
                  <DataTable data={dataset.table} />
                </CardContent>
              </Card>
            )}
          </Stack>
        </Container>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
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
        </Alert>
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
    </ThemeProvider>
  );
}

export default App;
