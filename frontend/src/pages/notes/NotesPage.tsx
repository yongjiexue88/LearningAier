import AddIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeRounded";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswerRounded";
import StyleIcon from "@mui/icons-material/StyleRounded";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";

export function NotesPage() {
  const [languageTab, setLanguageTab] = useState<"zh" | "en">("zh");

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
        gap: 3,
      }}
    >
      <Box>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Folders</Typography>
            <IconButton color="primary" size="small">
              <AddIcon />
            </IconButton>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2, minHeight: 400 }}>
          <Typography variant="body2" color="text.secondary">
            Folder tree coming soon. Users will expand/collapse nested folders,
            create new folders, and select notes to edit.
          </Typography>
        </Paper>
      </Box>

      <Box>
        <Paper sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <TextField fullWidth size="small" label="Note title" />
            <Button variant="outlined" startIcon={<AddIcon />}>
              New Note
            </Button>
          </Stack>
          <Divider />

          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <Button startIcon={<AutoAwesomeIcon />} variant="outlined">
              Generate Notes
            </Button>
            <Button startIcon={<StyleIcon />} variant="outlined">
              Generate Flashcards
            </Button>
            <Button startIcon={<QuestionAnswerIcon />} variant="contained">
              Ask AI
            </Button>
          </Stack>

          <Tabs
            value={languageTab}
            onChange={(_, val) => setLanguageTab(val)}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab value="zh" label="Chinese" />
            <Tab value="en" label="English" />
          </Tabs>

          <TextField
            multiline
            minRows={10}
            placeholder={`Write ${languageTab === "zh" ? "Chinese" : "English"} markdown here...`}
          />
        </Paper>
      </Box>
    </Box>
  );
}
