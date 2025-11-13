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
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1}>
            <TextField fullWidth size="small" placeholder="Add a new task..." />
            <Button variant="contained">Add</Button>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Tasks</Typography>
          <List>
            {tasks.map((task) => (
              <ListItem key={task.id} divider>
                <ListItemText primary={task.title} secondary={`Status: ${task.status}`} />
                <ListItemSecondaryAction>
                  <Button variant="text" size="small">
                    Link note
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>

      <Box>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pomodoro Timer
          </Typography>
          <Box textAlign="center" my={3}>
            <Typography variant="h2" fontWeight={700}>
              25:00
            </Typography>
            <Typography variant="body2" color="text.secondary">
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
            <IconButton color="default">
              <RefreshRounded />
            </IconButton>
          </Stack>
          <Divider sx={{ my: 3 }} />
          <Stack spacing={1}>
            <Typography variant="subtitle2">Stats</Typography>
            <Typography variant="body2" color="text.secondary">
              Show daily completions and weekly bar chart here.
            </Typography>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
