import {
    Box,
    Card,
    CardContent,
    Divider,
    Paper,
    Stack,
    Typography,
    LinearProgress,
} from '@mui/material';
import { usePomodoroStats } from '../../hooks/usePomodoroSessions';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import TrendingUpIcon from '@mui/icons-material/TrendingUpRounded';
import TimerIcon from '@mui/icons-material/TimerRounded';

export function SessionStats() {
    const stats = usePomodoroStats();

    const maxCount = Math.max(...stats.dailyCounts.map(d => d.count), 1);

    return (
        <Card>
            <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Statistics
                </Typography>

                {/* Summary Cards */}
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ mb: 4, mt: 2 }}
                >
                    <Paper
                        sx={{
                            flex: 1,
                            p: 2.5,
                            background: 'linear-gradient(135deg, #667eea15 0%, #764ba225 100%)',
                            border: '1px solid',
                            borderColor: 'primary.light',
                        }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: (theme) => theme.palette.primary.main,
                                    color: 'white',
                                }}
                            >
                                <LocalFireDepartmentIcon />
                            </Box>
                            <Box>
                                <Typography variant="h4" fontWeight={700} color="primary.main">
                                    {stats.todayCount}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Today's Focus Sessions
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>

                    <Paper
                        sx={{
                            flex: 1,
                            p: 2.5,
                            background: 'linear-gradient(135deg, #f093fb15 0%, #f5576c25 100%)',
                            border: '1px solid',
                            borderColor: 'secondary.light',
                        }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: (theme) => theme.palette.secondary.main,
                                    color: 'white',
                                }}
                            >
                                <TrendingUpIcon />
                            </Box>
                            <Box>
                                <Typography variant="h4" fontWeight={700} color="secondary.main">
                                    {stats.weekCount}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    This Week
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Stack>

                {/* Total Focus Time */}
                <Paper
                    sx={{
                        p: 2.5,
                        mb: 3,
                        background: 'linear-gradient(135deg, #a8edea15 0%, #fed6e325 100%)',
                        border: '1px solid',
                        borderColor: 'success.light',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: (theme) => theme.palette.success.main,
                                color: 'white',
                            }}
                        >
                            <TimerIcon />
                        </Box>
                        <Box flex={1}>
                            <Typography variant="h4" fontWeight={700} color="success.main">
                                {stats.totalFocusMinutes} min
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Total Focus Time ({Math.floor(stats.totalFocusMinutes / 60)}h {stats.totalFocusMinutes % 60}m)
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                <Divider sx={{ my: 3 }} />

                {/* 7-Day Chart */}
                <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Last 7 Days
                    </Typography>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        {stats.dailyCounts.map((day, index) => (
                            <Box key={index}>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{ mb: 0.5 }}
                                >
                                    <Typography variant="caption" color="text.secondary">
                                        {day.date}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={600}>
                                        {day.count} {day.count === 1 ? 'session' : 'sessions'}
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={(day.count / maxCount) * 100}
                                    sx={{
                                        height: 8,
                                        borderRadius: 1,
                                        backgroundColor: 'action.hover',
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 1,
                                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                        },
                                    }}
                                />
                            </Box>
                        ))}
                    </Stack>
                </Box>

                {/* Motivational Message */}
                {stats.todayCount > 0 && (
                    <Paper
                        sx={{
                            mt: 3,
                            p: 2,
                            background: (theme) => `linear-gradient(135deg, ${theme.palette.success.main}15 0%, ${theme.palette.success.dark}25 100%)`,
                            border: '1px solid',
                            borderColor: 'success.main',
                        }}
                    >
                        <Typography variant="body2" fontWeight={500} color="success.dark" textAlign="center">
                            {stats.todayCount === 1 && '🎯 Great start! Keep the momentum going!'}
                            {stats.todayCount >= 2 && stats.todayCount < 4 && '🔥 You\'re on fire! Keep it up!'}
                            {stats.todayCount >= 4 && stats.todayCount < 8 && '⭐ Excellent focus today! You\'re crushing it!'}
                            {stats.todayCount >= 8 && '🏆 Incredible productivity! You\'re a focus master!'}
                        </Typography>
                    </Paper>
                )}
            </CardContent>
        </Card>
    );
}
