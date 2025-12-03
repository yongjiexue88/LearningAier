import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    type DocumentData,
    type QueryDocumentSnapshot,
    Timestamp,
} from 'firebase/firestore';
import { useAuth } from '../providers/AuthProvider';
import { firebaseDb } from '../lib/firebaseClient';
import type { PomodoroSession, PomodoroStats, SessionType } from '../types/pomodoro';
import dayjs from 'dayjs';

function mapSessionDoc(docSnap: QueryDocumentSnapshot<DocumentData>): PomodoroSession {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        user_id: data.user_id,
        task_id: data.task_id || null,
        duration_minutes: data.duration_minutes,
        started_at: data.started_at instanceof Timestamp
            ? data.started_at.toDate().toISOString()
            : data.started_at,
        completed_at: data.completed_at instanceof Timestamp
            ? data.completed_at.toDate().toISOString()
            : data.completed_at,
        completed: data.completed,
        session_type: data.session_type || 'work',
    };
}

/**
 * Hook to fetch all Pomodoro sessions for the current user
 */
export function usePomodoroSessions() {
    const { user } = useAuth();
    const userId = user?.uid ?? null;

    return useQuery({
        enabled: Boolean(userId),
        queryKey: ['pomodoro', 'sessions', userId],
        queryFn: async (): Promise<PomodoroSession[]> => {
            if (!userId) return [];

            const baseQuery = query(
                collection(firebaseDb, 'pomodoro_sessions'),
                where('user_id', '==', userId)
            );

            try {
                const snapshot = await getDocs(
                    query(baseQuery, orderBy('completed_at', 'desc'))
                );
                return snapshot.docs.map(mapSessionDoc);
            } catch (error) {
                // If index doesn't exist, fetch without ordering
                const snapshot = await getDocs(baseQuery);
                return snapshot.docs
                    .map(mapSessionDoc)
                    .sort((a, b) =>
                        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
                    );
            }
        },
    });
}

/**
 * Hook to create a new Pomodoro session
 */
export function useCreatePomodoroSession() {
    const { user } = useAuth();
    const userId = user?.uid ?? null;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            task_id?: string | null;
            duration_minutes: number;
            completed: boolean;
            session_type?: SessionType;
        }) => {
            if (!userId) throw new Error('User not authenticated');

            const now = new Date().toISOString();

            const payload = {
                user_id: userId,
                task_id: data.task_id || null,
                duration_minutes: data.duration_minutes,
                started_at: dayjs().subtract(data.duration_minutes, 'minutes').toISOString(),
                completed_at: now,
                completed: data.completed,
                session_type: data.session_type || 'work',
            };

            const docRef = await addDoc(collection(firebaseDb, 'pomodoro_sessions'), payload);
            return { id: docRef.id, ...payload };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pomodoro', 'sessions', userId] });
        },
    });
}

/**
 * Hook to get Pomodoro statistics
 */
export function usePomodoroStats(): PomodoroStats {
    const { data: sessions = [] } = usePomodoroSessions();

    const today = dayjs().startOf('day');
    const weekAgo = dayjs().subtract(7, 'days').startOf('day');

    // Filter completed work sessions only
    const completedWorkSessions = sessions.filter(
        s => s.completed && s.session_type === 'work'
    );

    const todayCount = completedWorkSessions.filter(
        s => dayjs(s.completed_at).isAfter(today)
    ).length;

    const weekCount = completedWorkSessions.filter(
        s => dayjs(s.completed_at).isAfter(weekAgo)
    ).length;

    const totalFocusMinutes = completedWorkSessions.reduce(
        (sum, s) => sum + s.duration_minutes,
        0
    );

    // Calculate daily counts for the last 7 days
    const dailyCounts: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = dayjs().subtract(i, 'days').startOf('day');
        const count = completedWorkSessions.filter(
            s => dayjs(s.completed_at).isSame(date, 'day')
        ).length;

        dailyCounts.push({
            date: date.format('MMM DD'),
            count,
        });
    }

    return {
        todayCount,
        weekCount,
        totalFocusMinutes,
        dailyCounts,
    };
}
