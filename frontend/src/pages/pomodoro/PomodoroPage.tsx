import { Box, Snackbar, Alert } from '@mui/material';
import { useState } from 'react';
import { TaskList } from '../../components/pomodoro/TaskList';
import { PomodoroTimer } from '../../components/pomodoro/PomodoroTimer';
import { SessionStats } from '../../components/pomodoro/SessionStats';
import { usePomodoroTasks } from '../../hooks/usePomodoroTasks';

export function PomodoroPage() {
  const { data: tasks = [], isLoading } = usePomodoroTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        Loading...
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
          gap: 3,
        }}
      >
        {/* Left Sidebar - Task List */}
        <Box>
          <TaskList
            tasks={tasks}
            onTaskSelect={setSelectedTaskId}
            selectedTaskId={selectedTaskId}
          />
        </Box>

        {/* Right Main Area - Timer and Stats */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <PomodoroTimer tasks={tasks} />
          <SessionStats />
        </Box>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
