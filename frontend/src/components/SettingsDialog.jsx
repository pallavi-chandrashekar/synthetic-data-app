import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const FIELDS = [
  { provider: "openai", label: "OpenAI API Key", placeholder: "sk-..." },
  { provider: "anthropic", label: "Anthropic API Key", placeholder: "sk-ant-..." },
  { provider: "google", label: "Google API Key", placeholder: "AIza..." },
];

export default function SettingsDialog({ open, onClose, apiKeys, updateKey, clearKeys }) {
  const [visible, setVisible] = useState({});

  const toggle = (provider) =>
    setVisible((prev) => ({ ...prev, [provider]: !prev[provider] }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>API Key Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {FIELDS.map(({ provider, label, placeholder }) => (
            <TextField
              key={provider}
              label={label}
              placeholder={placeholder}
              type={visible[provider] ? "text" : "password"}
              value={apiKeys[provider] || ""}
              onChange={(e) => updateKey(provider, e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={`toggle ${provider} key visibility`}
                      onClick={() => toggle(provider)}
                      edge="end"
                      size="small"
                    >
                      {visible[provider] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={clearKeys} color="error">
          Clear All Keys
        </Button>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
