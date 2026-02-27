import { Button, Stack } from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import DownloadIcon from "@mui/icons-material/Download";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import ShuffleIcon from "@mui/icons-material/Shuffle";

export default function ActionBar({ loading, dataset, format, prompt, onGenerate, onDownload, onCopy, onRegenerate, onRandomPrompt }) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Button
        variant="contained"
        startIcon={<RocketLaunchIcon />}
        onClick={onGenerate}
        disabled={loading}
        aria-label="Generate data"
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
        onClick={onDownload}
        disabled={!dataset || dataset.format !== format}
        startIcon={<DownloadIcon />}
        aria-label={`Download ${format.toUpperCase()}`}
        sx={{ textTransform: "none", px: 2.5, "&:hover": { transform: "translateY(-1px) scale(1.01)" } }}
      >
        Download {format.toUpperCase()}
      </Button>
      <Button
        variant="outlined"
        onClick={onCopy}
        disabled={!dataset}
        startIcon={<ContentCopyIcon />}
        aria-label="Copy to clipboard"
        sx={{ textTransform: "none", px: 2.5, "&:hover": { transform: "translateY(-1px) scale(1.01)" } }}
      >
        Copy
      </Button>
      <Button
        variant="outlined"
        onClick={onRegenerate}
        disabled={loading || !prompt.trim()}
        startIcon={<RefreshIcon />}
        aria-label="Re-generate data"
        sx={{ textTransform: "none", px: 2.5, "&:hover": { transform: "translateY(-1px) scale(1.01)" } }}
      >
        Re-generate
      </Button>
      <Button
        variant="text"
        startIcon={<ShuffleIcon />}
        aria-label="Random prompt"
        onClick={onRandomPrompt}
        sx={{ textTransform: "none" }}
      >
        Random prompt
      </Button>
    </Stack>
  );
}
