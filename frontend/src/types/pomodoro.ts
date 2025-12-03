/**
 * TypeScript types and interfaces for Pomodoro task management
 */

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TimerState = 'idle' | 'running' | 'paused';
export type SessionType = 'work' | 'break' | 'long-break';

/**
 * Pomodoro task interface
 */
export interface PomodoroTask {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    note_id?: string | null;
    created_at: string;
    updated_at: string;
    sort_order: number;
}

/**
 * Pomodoro session interface
 */
export interface PomodoroSession {
    id: string;
    user_id: string;
    task_id?: string | null;
    duration_minutes: number;
    started_at: string;
    completed_at: string;
    completed: boolean;
    session_type: SessionType;
}

/**
 * Timer settings interface
 */
export interface TimerSettings {
    workDuration: number;      // in minutes, default 25
    breakDuration: number;      // in minutes, default 5
    longBreakDuration: number;  // in minutes, default 15
    autoStartBreak: boolean;    // default false
    soundEnabled: boolean;      // default true
    notificationEnabled: boolean; // default true
}

/**
 * Statistics interface
 */
export interface PomodoroStats {
    todayCount: number;
    weekCount: number;
    totalFocusMinutes: number;
    dailyCounts: { date: string; count: number }[];
}
