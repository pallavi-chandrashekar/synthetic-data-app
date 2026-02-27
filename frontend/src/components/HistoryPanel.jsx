import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import HistoryIcon from "@mui/icons-material/History";

export default function HistoryPanel({
  history,
  deleteDialogOpen,
  promptToDelete,
  onHistoryClick,
  onDeletePrompt,
  onClearHistory,
  onOpenDeleteDialog,
  onCloseDeleteDialog,
}) {
  return (
    <>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="stretch">
        <Card sx={{ flex: 1, transition: "transform 150ms ease, box-shadow 150ms ease", "&:hover": { transform: "translateY(-2px)", boxShadow: 8 } }}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Prompt History</Typography>
              <Button size="small" onClick={onClearHistory} disabled={history.length === 0} startIcon={<HistoryIcon />} aria-label="Clear history">
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
                    <Button variant="text" onClick={() => onHistoryClick(item)} aria-label={`Use prompt: ${item}`} sx={{ textAlign: "left" }}>
                      {item}
                    </Button>
                    <IconButton color="error" onClick={() => onOpenDeleteDialog(item)} size="small" aria-label={`Delete prompt: ${item}`}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={deleteDialogOpen} onClose={onCloseDeleteDialog}>
        <DialogTitle>Delete Prompt</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the prompt "{promptToDelete}" from history?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseDeleteDialog}>Cancel</Button>
          <Button color="error" onClick={onDeletePrompt}>Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
