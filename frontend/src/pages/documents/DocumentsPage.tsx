import CloudUploadIcon from "@mui/icons-material/CloudUploadRounded";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export function DocumentsPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Document Import
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload PDFs, let the backend process them, and review the generated bilingual notes.
        </Typography>
      </Box>

      <Paper
        sx={{
          p: 4,
          border: "2px dashed",
          borderColor: "primary.light",
          textAlign: "center",
          backgroundColor: "background.paper",
        }}
      >
        <CloudUploadIcon color="primary" sx={{ fontSize: 48 }} />
        <Typography variant="h6">Drag & drop PDF here</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          We will send the file to Supabase Storage then call `/documents/upload/process`.
        </Typography>
        <Button variant="contained">Select File</Button>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
          gap: 3,
        }}
      >
        <Box>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Generated Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Show zh/en summary for quick triage before saving to notes.
            </Typography>
            <TextField multiline placeholder="Summary (ZH)" minRows={5} fullWidth sx={{ mb: 2 }} />
            <TextField multiline placeholder="Summary (EN)" minRows={5} fullWidth />
          </Paper>
        </Box>
        <Box>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Flashcard Drafts
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Render terminology table for user approval before saving.
            </Typography>
            <Stack spacing={1}>
              <TextField label="Folder" size="small" />
              <TextField
                label="Notes destination"
                placeholder="Choose target folder / note"
                size="small"
              />
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" fullWidth>
                  Discard
                </Button>
                <Button variant="contained" fullWidth>
                  Save
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Stack>
  );
}
