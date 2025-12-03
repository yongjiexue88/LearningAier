import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    IconButton,
    MenuItem,
    Select,
    Stack,
    Typography,
    styled,
    keyframes,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import PauseIcon from '@mui/icons-material/PauseRounded';
import RefreshIcon from '@mui/icons-material/RefreshRounded';
import { usePomodoroTimer } from '../../hooks/usePomodoroTimer';
import { useCreatePomodoroSession } from '../../hooks/usePomodoroSessions';
import type { PomodoroTask } from '../../types/pomodoro';
import { useState } from 'react';

interface PomodoroTimerProps {
    tasks: PomodoroTask[];
}

// Pulse animation for completion
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

// Styled circular progress container
const CircularProgressContainer = styled(Box)(({ theme }) => ({
    position: 'relative',
    display: 'inline-flex',
    width: 280,
    height: 280,
    margin: '0 auto',
    [theme.breakpoints.down('sm')]: {
        width: 220,
        height: 220,
    },
}));

const TimerDisplay = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'timerState',
})<{ timerState: 'idle' | 'running' | 'paused' }>(({ theme, timerState }) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    background:
        timerState === 'running'
            ? `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.dark}25 100%)`
            : timerState === 'paused'
                ? `linear-gradient(135deg, ${theme.palette.warning.main}15 0%, ${theme.palette.warning.dark}25 100%)`
                : `linear-gradient(135deg, ${theme.palette.grey[300]}15 0%, ${theme.palette.grey[500]}25 100%)`,
    borderRadius: '50%',
    transition: 'all 0.4s ease',
    backdropFilter: 'blur(10px)',
}));

export function PomodoroTimer({ tasks }: PomodoroTimerProps) {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const createSession = useCreatePomodoroSession();

    const {
        minutes,
        seconds,
        timerState,
        sessionType,
        progress,
        start,
        pause,
        resume,
        reset,
    } = usePomodoroTimer({
        initialDuration: 25,
        onComplete: () => {
            // Save session to Firestore when timer completes
            if (sessionType === 'work') {
                createSession.mutate({
                    task_id: selectedTaskId,
                    duration_minutes: 25,
                    completed: true,
                    session_type: 'work',
                });
            }
        },
    });

    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const getTimerColor = () => {
        if (timerState === 'running') return 'primary';
        if (timerState === 'paused') return 'warning';
        return 'inherit';
    };

    const getGradientColor = () => {
        if (timerState === 'running') return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        if (timerState === 'paused') return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        return 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
    };

    return (
        <Card
            sx={{
                background: getGradientColor(),
                transition: 'background 0.6s ease',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: (theme) => theme.palette.background.paper,
                    opacity: 0.9,
                    backdropFilter: 'blur(20px)',
                },
            }}
        >
            <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
                <Stack spacing={3}>
                    {/* Header */}
                    <Box>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Pomodoro Timer
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {sessionType === 'work' ? 'Focus Session' : 'Break Time'}
                        </Typography>
                    </Box>

                    {/* Timer Circle */}
                    <Box textAlign="center" my={4}>
                        <CircularProgressContainer
                            sx={{
                                animation: timerState === 'idle' && progress === 0 && minutes === 0
                                    ? `${pulse} 0.6s ease-in-out 3`
                                    : 'none',
                            }}
                        >
                            <CircularProgress
                                variant="determinate"
                                value={progress}
                                size={280}
                                thickness={3}
                                color={getTimerColor()}
                                sx={{
                                    position: 'absolute',
                                    left: 0,
                                    '& .MuiCircularProgress-circle': {
                                        transition: 'stroke-dashoffset 0.3s ease',
                                    },
                                    '@media (max-width: 600px)': {
                                        width: 220,
                                        height: 220,
                                    },
                                }}
                            />
                            <TimerDisplay timerState={timerState}>
                                <Typography
                                    variant="h2"
                                    fontWeight={700}
                                    color={getTimerColor()}
                                    sx={{
                                        fontSize: { xs: '3rem', sm: '4rem' },
                                        lineHeight: 1,
                                        fontFeatureSettings: '"tnum"',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {formattedTime}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: 1, textTransform: 'uppercase', letterSpacing: 1 }}
                                >
                                    {timerState === 'idle' && 'Ready to Focus'}
                                    {timerState === 'running' && 'In Progress'}
                                    {timerState === 'paused' && 'Paused'}
                                </Typography>
                            </TimerDisplay>
                        </CircularProgressContainer>
                    </Box>

                    {/* Task Selection */}
                    <Select
                        size="small"
                        value={selectedTaskId || ''}
                        onChange={(e) => setSelectedTaskId(e.target.value || null)}
                        displayEmpty
                        fullWidth
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="">
                            <em>No task selected</em>
                        </MenuItem>
                        {tasks
                            .filter(t => t.status !== 'done')
                            .map((task) => (
                                <MenuItem key={task.id} value={task.id}>
                                    {task.title}
                                </MenuItem>
                            ))}
                    </Select>

                    {/* Controls */}
                    <Stack direction="row" justifyContent="center" spacing={2}>
                        {timerState === 'idle' && (
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<PlayArrowIcon />}
                                onClick={() => start(25, 'work')}
                                sx={{
                                    minWidth: 140,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                    },
                                }}
                            >
                                Start
                            </Button>
                        )}

                        {timerState === 'running' && (
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<PauseIcon />}
                                onClick={pause}
                                color="warning"
                                sx={{ minWidth: 140 }}
                            >
                                Pause
                            </Button>
                        )}

                        {timerState === 'paused' && (
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<PlayArrowIcon />}
                                onClick={resume}
                                color="primary"
                                sx={{ minWidth: 140 }}
                            >
                                Resume
                            </Button>
                        )}

                        <IconButton
                            color="default"
                            onClick={reset}
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    backgroundColor: 'action.hover',
                                },
                            }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Stack>

                    {/* Quick Actions */}
                    <Stack direction="row" spacing={1} justifyContent="center">
                        <Button
                            size="small"
                            variant="text"
                            onClick={() => start(5, 'break')}
                            disabled={timerState !== 'idle'}
                        >
                            5 min break
                        </Button>
                        <Button
                            size="small"
                            variant="text"
                            onClick={() => start(15, 'long-break')}
                            disabled={timerState !== 'idle'}
                        >
                            15 min break
                        </Button>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}
