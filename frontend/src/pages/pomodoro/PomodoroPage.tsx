import PlayArrowIcon from "@mui/icons-material/PlayArrowRounded";
import { PauseRounded, RefreshRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const tasks = [
  { id: "1", title: "Read AI article", status: "doing" },
  { id: "2", title: "Summarize chapter 2", status: "todo" },
];

export function PomodoroPage() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
        gap: 3,
      }}
    >
      <Box>
        <Paper sx={{ p: 2.5, mb: 3 }}>
          <Stack direction="row" spacing={1.5}>
            <TextField fullWidth size="small" placeholder="Add a new task..." />
            <Button variant="contained" sx={{ minWidth: 80 }}>Add</Button>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Tasks</Typography>
          <List>
            {tasks.map((task) => (
              <ListItem key={task.id} divider>
                <ListItemText
                  primary={task.title}
                  secondary={`Status: ${task.status}`}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
                <ListItemSecondaryAction>
                  <Button variant="text" size="small" sx={{ textTransform: "none" }}>
                    Link note
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>

      <Box>
        <Card>
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Pomodoro Timer
            </Typography>
            <Box textAlign="center" my={4}>
              <Typography variant="h2" fontWeight={600} color="primary.main">
                25:00
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Link timer to a task and log completed sessions.
              </Typography>
            </Box>
            <Stack direction="row" justifyContent="center" spacing={2}>
              <Button variant="contained" startIcon={<PlayArrowIcon />}>
                Start
              </Button>
              <Button variant="outlined" startIcon={<PauseRounded />}>
                Pause
              </Button>
              <IconButton
                color="default"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  "&:hover": {
                    borderColor: "primary.main",
                  },
                }}
              >
                <RefreshRounded />
              </IconButton>
            </Stack>
            <Divider sx={{ my: 3 }} />
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" fontWeight={600}>Stats</Typography>
              <Typography variant="body2" color="text.secondary">
                Show daily completions and weekly bar chart here.
              </Typography>
            </Stack>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
