import {
  Alert,
  Chip,
  MenuItem,
  Select,
  Stack,
  Grow,
  TextField,
} from "@mui/material";
import CelebrationIcon from "@mui/icons-material/Celebration";
import { SAMPLE_PROMPTS } from "../App";

export default function PromptForm({ prompt, setPrompt, format, setFormat, rowCount, setRowCount, datasetSummary, onKeyDown, actionBar }) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
        <Select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          size="small"
          inputProps={{ "aria-label": "Output format" }}
          sx={{ width: 140, backgroundColor: "background.paper" }}
        >
          <MenuItem value="json">JSON</MenuItem>
          <MenuItem value="csv">CSV</MenuItem>
        </Select>
        <TextField
          type="number"
          label="Rows"
          size="small"
          value={rowCount}
          onChange={(e) => {
            const v = Math.max(1, Math.min(1000, Number(e.target.value) || 1));
            setRowCount(v);
          }}
          inputProps={{ min: 1, max: 1000, "aria-label": "Number of rows" }}
          sx={{ width: 100, backgroundColor: "background.paper" }}
        />
        {actionBar}
      </Stack>

      <TextField
        label="Prompt"
        multiline
        fullWidth
        minRows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="e.g. Generate 20 sample users with name, email, and signup date"
        helperText="Press Ctrl+Enter / Cmd+Enter to generate"
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
  );
}
