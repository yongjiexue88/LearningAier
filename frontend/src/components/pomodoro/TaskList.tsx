import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
    Checkbox,
    ListItemSecondaryAction,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import LinkIcon from '@mui/icons-material/LinkRounded';
import AddIcon from '@mui/icons-material/AddRounded';
import { useState } from 'react';
import type { PomodoroTask, TaskStatus } from '../../types/pomodoro';
import {
    useCreatePomodoroTask,
    useUpdatePomodoroTask,
    useDeletePomodoroTask,
} from '../../hooks/usePomodoroTasks';

interface TaskListProps {
    tasks: PomodoroTask[];
    onTaskSelect?: (taskId: string) => void;
    selectedTaskId?: string | null;
}

export function TaskList({ tasks, onTaskSelect, selectedTaskId }: TaskListProps) {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [editingTask, setEditingTask] = useState<PomodoroTask | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

    const createTask = useCreatePomodoroTask();
    const updateTask = useUpdatePomodoroTask();
    const deleteTask = useDeletePomodoroTask();

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim()) return;

        try {
            await createTask.mutateAsync({ title: newTaskTitle });
            setNewTaskTitle('');
        } catch (error) {
            console.error('Failed to create task:', error);
        }
    };

    const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
        try {
            await updateTask.mutateAsync({ id: taskId, status });
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteTask.mutateAsync(taskId);
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    const handleEditSubmit = async () => {
        if (!editingTask || !editTitle.trim()) return;

        try {
            await updateTask.mutateAsync({
                id: editingTask.id,
                title: editTitle
            });
            setEditingTask(null);
            setEditTitle('');
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    };

    const filteredTasks = statusFilter === 'all'
        ? tasks
        : tasks.filter(task => task.status === statusFilter);

    const getStatusColor = (status: TaskStatus): "default" | "primary" | "success" => {
        switch (status) {
            case 'todo': return 'default';
            case 'doing': return 'primary';
            case 'done': return 'success';
        }
    };

    return (
        <Box>
            {/* Create Task Input */}
            <Paper sx={{ p: 2.5, mb: 3 }}>
                <Stack direction="row" spacing={1.5}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Add a new task..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleCreateTask();
                            }
                        }}
                    />
                    <Button
                        variant="contained"
                        sx={{ minWidth: 80 }}
                        onClick={handleCreateTask}
                        disabled={createTask.isPending || !newTaskTitle.trim()}
                        startIcon={<AddIcon />}
                    >
                        Add
                    </Button>
                </Stack>
            </Paper>

            {/* Filter */}
            <Paper sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" fontWeight={600}>
                            Tasks
                        </Typography>
                        <TextField
                            select
                            size="small"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                            sx={{ minWidth: 120 }}
                        >
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="todo">To Do</MenuItem>
                            <MenuItem value="doing">Doing</MenuItem>
                            <MenuItem value="done">Done</MenuItem>
                        </TextField>
                    </Stack>

                    {/* Task List */}
                    {filteredTasks.length === 0 ? (
                        <Box
                            sx={{
                                textAlign: 'center',
                                py: 6,
                                color: 'text.secondary',
                            }}
                        >
                            <Typography variant="body2">
                                {statusFilter === 'all'
                                    ? 'No tasks yet. Create one to get started!'
                                    : `No ${statusFilter} tasks.`}
                            </Typography>
                        </Box>
                    ) : (
                        <List sx={{ p: 0 }}>
                            {filteredTasks.map((task) => (
                                <ListItem
                                    key={task.id}
                                    divider
                                    sx={{
                                        py: 1.5,
                                        px: 0,
                                        cursor: onTaskSelect ? 'pointer' : 'default',
                                        bgcolor: selectedTaskId === task.id
                                            ? 'action.selected'
                                            : 'transparent',
                                        borderRadius: 1,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                        },
                                    }}
                                    onClick={() => onTaskSelect?.(task.id)}
                                >
                                    {task.status === 'done' && (
                                        <Checkbox
                                            edge="start"
                                            checked
                                            tabIndex={-1}
                                            disableRipple
                                            sx={{ mr: 1 }}
                                        />
                                    )}
                                    <ListItemText
                                        primary={task.title}
                                        secondary={
                                            <Chip
                                                label={task.status}
                                                size="small"
                                                color={getStatusColor(task.status)}
                                                sx={{ mt: 0.5, textTransform: 'capitalize' }}
                                            />
                                        }
                                        primaryTypographyProps={{
                                            fontWeight: 500,
                                            sx: {
                                                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                                color: task.status === 'done' ? 'text.secondary' : 'text.primary',
                                            },
                                        }}
                                    />
                                    <ListItemSecondaryAction>
                                        <Stack direction="row" spacing={0.5}>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingTask(task);
                                                    setEditTitle(task.title);
                                                }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            {task.status !== 'done' && (
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdateStatus(task.id, 'done');
                                                    }}
                                                    color="success"
                                                >
                                                    <CheckCircleIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            {task.status === 'done' && (
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdateStatus(task.id, 'todo');
                                                    }}
                                                >
                                                    <LinkIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTask(task.id);
                                                }}
                                                color="error"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Stack>
            </Paper>

            {/* Edit Dialog */}
            <Dialog open={!!editingTask} onClose={() => setEditingTask(null)}>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Task Title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleEditSubmit();
                            }
                        }}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditingTask(null)}>Cancel</Button>
                    <Button
                        onClick={handleEditSubmit}
                        variant="contained"
                        disabled={!editTitle.trim()}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
