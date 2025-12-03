import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerState, SessionType } from '../types/pomodoro';

interface UsePomodoroTimerProps {
    initialDuration?: number; // in minutes
    onComplete?: () => void;
}

interface UsePomodoroTimerReturn {
    minutes: number;
    seconds: number;
    totalSeconds: number;
    timerState: TimerState;
    sessionType: SessionType;
    progress: number; // 0-100
    start: (duration?: number, type?: SessionType) => void;
    pause: () => void;
    resume: () => void;
    reset: () => void;
    setDuration: (minutes: number) => void;
}

const STORAGE_KEY = 'pomodoro_timer_state';

export function usePomodoroTimer({
    initialDuration = 25,
    onComplete,
}: UsePomodoroTimerProps = {}): UsePomodoroTimerReturn {
    const [totalSeconds, setTotalSeconds] = useState(initialDuration * 60);
    const [initialTotalSeconds, setInitialTotalSeconds] = useState(initialDuration * 60);
    const [timerState, setTimerState] = useState<TimerState>('idle');
    const [sessionType, setSessionType] = useState<SessionType>('work');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Load timer state from localStorage on mount
    useEffect(() => {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.totalSeconds && parsed.timerState === 'paused') {
                    setTotalSeconds(parsed.totalSeconds);
                    setInitialTotalSeconds(parsed.initialTotalSeconds || initialDuration * 60);
                    setTimerState('paused');
                    setSessionType(parsed.sessionType || 'work');
                }
            } catch (e) {
                console.error('Failed to parse saved timer state', e);
            }
        }
    }, [initialDuration]);

    // Save timer state to localStorage
    const saveTimerState = useCallback((seconds: number, state: TimerState, type: SessionType, initial: number) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            totalSeconds: seconds,
            timerState: state,
            sessionType: type,
            initialTotalSeconds: initial,
        }));
    }, []);

    // Clear saved state
    const clearTimerState = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    // Initialize audio element
    useEffect(() => {
        // Create a simple beep sound using data URI
        const beepSound = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGe76+F';
        audioRef.current = new Audio(beepSound);
    }, []);

    // Request notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const showNotification = useCallback((title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/favicon.ico',
            });
        }
    }, []);

    const playSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.play().catch((e) => console.error('Failed to play sound', e));
        }
    }, []);

    // Countdown effect
    useEffect(() => {
        if (timerState === 'running') {
            intervalRef.current = setInterval(() => {
                setTotalSeconds((prev) => {
                    const newSeconds = prev - 1;

                    // Save state periodically
                    if (newSeconds % 10 === 0) {
                        saveTimerState(newSeconds, 'running', sessionType, initialTotalSeconds);
                    }

                    if (newSeconds <= 0) {
                        // Timer completed
                        setTimerState('idle');
                        clearTimerState();
                        playSound();

                        const message = sessionType === 'work'
                            ? 'Great job! Time for a break.'
                            : 'Break over! Ready to focus?';

                        showNotification('Pomodoro Timer', message);

                        if (onComplete) {
                            onComplete();
                        }

                        return 0;
                    }

                    return newSeconds;
                });
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [timerState, sessionType, initialTotalSeconds, onComplete, saveTimerState, clearTimerState, playSound, showNotification]);

    const start = useCallback((duration?: number, type: SessionType = 'work') => {
        const durationInSeconds = duration ? duration * 60 : initialDuration * 60;
        setTotalSeconds(durationInSeconds);
        setInitialTotalSeconds(durationInSeconds);
        setSessionType(type);
        setTimerState('running');
        saveTimerState(durationInSeconds, 'running', type, durationInSeconds);
    }, [initialDuration, saveTimerState]);

    const pause = useCallback(() => {
        setTimerState('paused');
        saveTimerState(totalSeconds, 'paused', sessionType, initialTotalSeconds);
    }, [totalSeconds, sessionType, initialTotalSeconds, saveTimerState]);

    const resume = useCallback(() => {
        setTimerState('running');
        saveTimerState(totalSeconds, 'running', sessionType, initialTotalSeconds);
    }, [totalSeconds, sessionType, initialTotalSeconds, saveTimerState]);

    const reset = useCallback(() => {
        setTotalSeconds(initialDuration * 60);
        setInitialTotalSeconds(initialDuration * 60);
        setTimerState('idle');
        setSessionType('work');
        clearTimerState();
    }, [initialDuration, clearTimerState]);

    const setDuration = useCallback((minutes: number) => {
        const seconds = minutes * 60;
        setTotalSeconds(seconds);
        setInitialTotalSeconds(seconds);
    }, []);

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const progress = initialTotalSeconds > 0
        ? ((initialTotalSeconds - totalSeconds) / initialTotalSeconds) * 100
        : 0;

    return {
        minutes,
        seconds,
        totalSeconds,
        timerState,
        sessionType,
        progress,
        start,
        pause,
        resume,
        reset,
        setDuration,
    };
}
