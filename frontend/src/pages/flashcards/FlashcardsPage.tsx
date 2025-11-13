import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

export function FlashcardsPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Flashcards
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review bilingual flashcards and keep the spaced repetition queue under control.
        </Typography>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          <TextField select label="Folder" fullWidth size="small">
            <MenuItem value="">All Folders</MenuItem>
          </TextField>
          <TextField select label="Note" fullWidth size="small">
            <MenuItem value="">All Notes</MenuItem>
          </TextField>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Switch />
            <Typography variant="body2">Due today only</Typography>
          </Stack>
          <Button variant="contained" fullWidth>
            Generate from current note
          </Button>
        </Box>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" },
          gap: 3,
        }}
      >
        <Box>
          <Card sx={{ minHeight: 320, display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="overline" color="text.secondary">
                Review queue
              </Typography>
              <Typography variant="h5" gutterBottom>
                Example Term 示例术语
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tap "Show answer" to reveal bilingual definitions. This will call the backend
                `/flashcards/:id/review` endpoint.
              </Typography>
            </CardContent>
            <Box sx={{ p: 2, display: "flex", gap: 1 }}>
              <Button variant="outlined" fullWidth>
                Show answer
              </Button>
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                p: 2,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              {["Again", "Hard", "Good", "Easy"].map((label) => (
                <Button key={label} size="small" variant="contained" sx={{ flex: 1 }}>
                  {label}
                </Button>
              ))}
            </Box>
          </Card>
        </Box>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              Card list
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Table view for browsing, editing, or deleting cards. Use DataGrid or Table in future
              iterations to support pagination and inline edits.
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Stack>
  );
}
