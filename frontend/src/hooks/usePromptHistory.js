import { useState } from "react";

export default function usePromptHistory(setSnackbar) {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("promptHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState(null);

  const savePromptToHistory = (prompt) => {
    if (!history.includes(prompt)) {
      const newHistory = [prompt, ...history.slice(0, 9)];
      setHistory(newHistory);
      localStorage.setItem("promptHistory", JSON.stringify(newHistory));
    }
  };

  const handleHistoryClick = (item) => item;

  const handleDeletePrompt = () => {
    const updated = history.filter((p) => p !== promptToDelete);
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

  const restoreDeleted = () => {
    const restored = [recentlyDeleted, ...history];
    setHistory(restored);
    localStorage.setItem("promptHistory", JSON.stringify(restored));
    setSnackbar({
      open: true,
      message: `Prompt "${recentlyDeleted}" restored`,
      severity: "success",
    });
    setRecentlyDeleted(null);
  };

  return {
    history,
    recentlyDeleted,
    deleteDialogOpen,
    promptToDelete,
    savePromptToHistory,
    handleHistoryClick,
    handleDeletePrompt,
    handleClearHistory,
    openDeleteDialog,
    closeDeleteDialog,
    restoreDeleted,
  };
}
