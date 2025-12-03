import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
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
import type { PomodoroTask, TaskStatus } from '../types/pomodoro';

function mapTaskDoc(docSnap: QueryDocumentSnapshot<DocumentData>): PomodoroTask {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        user_id: data.user_id,
        title: data.title,
        description: data.description,
        status: data.status,
        note_id: data.note_id,
        created_at: data.created_at instanceof Timestamp
            ? data.created_at.toDate().toISOString()
            : data.created_at,
        updated_at: data.updated_at instanceof Timestamp
            ? data.updated_at.toDate().toISOString()
            : data.updated_at,
        sort_order: data.sort_order || 0,
    };
}

/**
 * Hook to fetch all Pomodoro tasks for the current user
 */
export function usePomodoroTasks(statusFilter?: TaskStatus) {
    const { user } = useAuth();
    const userId = user?.uid ?? null;

    return useQuery({
        enabled: Boolean(userId),
        queryKey: ['pomodoro', 'tasks', userId, statusFilter],
        queryFn: async (): Promise<PomodoroTask[]> => {
            if (!userId) return [];

            const baseQuery = query(
                collection(firebaseDb, 'pomodoro_tasks'),
                where('user_id', '==', userId)
            );

            try {
                const snapshot = await getDocs(
                    query(baseQuery, orderBy('sort_order', 'asc'))
                );
                const tasks = snapshot.docs.map(mapTaskDoc);

                if (statusFilter) {
                    return tasks.filter(task => task.status === statusFilter);
                }

                return tasks;
            } catch (error) {
                // If index doesn't exist, fetch without ordering
                const snapshot = await getDocs(baseQuery);
                const tasks = snapshot.docs
                    .map(mapTaskDoc)
                    .sort((a, b) => a.sort_order - b.sort_order);

                if (statusFilter) {
                    return tasks.filter(task => task.status === statusFilter);
                }

                return tasks;
            }
        },
    });
}

/**
 * Hook to create a new Pomodoro task
 */
export function useCreatePomodoroTask() {
    const { user } = useAuth();
    const userId = user?.uid ?? null;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            title: string;
            description?: string;
            note_id?: string;
        }) => {
            if (!userId) throw new Error('User not authenticated');
            if (!data.title.trim()) throw new Error('Title is required');

            const now = new Date().toISOString();

            const payload = {
                user_id: userId,
                title: data.title,
                description: data.description || '',
                status: 'todo' as TaskStatus,
                note_id: data.note_id || null,
                created_at: now,
                updated_at: now,
                sort_order: Date.now(), // Use timestamp for ordering
            };

            const docRef = await addDoc(collection(firebaseDb, 'pomodoro_tasks'), payload);
            return { id: docRef.id, ...payload };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pomodoro', 'tasks', userId] });
        },
    });
}

/**
 * Hook to update a Pomodoro task
 */
export function useUpdatePomodoroTask() {
    const { user } = useAuth();
    const userId = user?.uid ?? null;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            id: string;
            title?: string;
            description?: string;
            status?: TaskStatus;
            note_id?: string | null;
        }) => {
            if (!userId) throw new Error('User not authenticated');

            const taskRef = doc(firebaseDb, 'pomodoro_tasks', data.id);
            const updateData: any = {
                updated_at: new Date().toISOString(),
            };

            if (data.title !== undefined) updateData.title = data.title;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.status !== undefined) updateData.status = data.status;
            if (data.note_id !== undefined) updateData.note_id = data.note_id;

            await updateDoc(taskRef, updateData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pomodoro', 'tasks', userId] });
        },
    });
}

/**
 * Hook to delete a Pomodoro task
 */
export function useDeletePomodoroTask() {
    const { user } = useAuth();
    const userId = user?.uid ?? null;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (taskId: string) => {
            if (!userId) throw new Error('User not authenticated');

            const taskRef = doc(firebaseDb, 'pomodoro_tasks', taskId);
            await deleteDoc(taskRef);
            return taskId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pomodoro', 'tasks', userId] });
        },
    });
}
