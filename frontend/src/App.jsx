import { useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  CssBaseline,
  Skeleton,
  Snackbar,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import DataTable from "./DataTable";
import useThemeMode from "./hooks/useThemeMode";
import usePromptHistory from "./hooks/usePromptHistory";
import useDataGeneration from "./hooks/useDataGeneration";
import PromptForm from "./components/PromptForm";
import ActionBar from "./components/ActionBar";
import HistoryPanel from "./components/HistoryPanel";

export const SAMPLE_PROMPTS = [
  "Generate 50 fake customer profiles with fields: name, email, age, country",
  "Generate 100 sales records with product, quantity, revenue, and date",
  "Generate a dataset of employee records with id, name, role, and joining_date",
  "Generate 25 SaaS subscriptions with plan_name, mrr, user_count, and status",
];

function App() {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("json");
  const [rowCount, setRowCount] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const { colorMode, theme, toggleColorMode } = useThemeMode();

  const {
    history,
    recentlyDeleted,
    deleteDialogOpen,
    promptToDelete,
    savePromptToHistory,
    handleDeletePrompt,
    handleClearHistory,
    openDeleteDialog,
    closeDeleteDialog,
    restoreDeleted,
  } = usePromptHistory(setSnackbar);

  const {
    dataset,
    loading,
    tableRef,
    datasetSummary,
    handleGenerate,
    handleDownload,
    handleCopyToClipboard,
    handleRegenerate,
  } = useDataGeneration({ format, rowCount, prompt, setSnackbar, savePromptToHistory });

  const handlePromptKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
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
          <Button
            variant="outlined"
            size="small"
            aria-label="Toggle theme"
            onClick={toggleColorMode}
            startIcon={colorMode === "light" ? <AutoAwesomeIcon /> : <Brightness7Icon />}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 2,
              fontWeight: 600,
            }}
          >
            {colorMode === "light" ? "Dark Mode" : "Light Mode"}
          </Button>
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
                <PromptForm
                  prompt={prompt}
                  setPrompt={setPrompt}
                  format={format}
                  setFormat={setFormat}
                  rowCount={rowCount}
                  setRowCount={setRowCount}
                  datasetSummary={datasetSummary}
                  onKeyDown={handlePromptKeyDown}
                  actionBar={
                    <ActionBar
                      loading={loading}
                      dataset={dataset}
                      format={format}
                      prompt={prompt}
                      onGenerate={handleGenerate}
                      onDownload={handleDownload}
                      onCopy={handleCopyToClipboard}
                      onRegenerate={handleRegenerate}
                      onRandomPrompt={() => {
                        const randomPrompt = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
                        setPrompt(randomPrompt);
                      }}
                    />
                  }
                />
              </CardContent>
            </Card>

            <HistoryPanel
              history={history}
              deleteDialogOpen={deleteDialogOpen}
              promptToDelete={promptToDelete}
              onHistoryClick={(item) => setPrompt(item)}
              onDeletePrompt={handleDeletePrompt}
              onClearHistory={handleClearHistory}
              onOpenDeleteDialog={openDeleteDialog}
              onCloseDeleteDialog={closeDeleteDialog}
            />

            {loading && (
              <Card>
                <CardContent>
                  <Skeleton variant="text" width={180} height={32} sx={{ mb: 2 }} />
                  <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} variant="rectangular" width={120} height={28} sx={{ borderRadius: 1 }} />
                    ))}
                  </Stack>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} variant="text" height={24} sx={{ my: 0.5 }} />
                  ))}
                </CardContent>
              </Card>
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
                onClick={restoreDeleted}
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
    </ThemeProvider>
  );
}

export default App;
