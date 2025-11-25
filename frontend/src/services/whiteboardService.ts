import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    type Timestamp,
} from "firebase/firestore";
import { firebaseDb } from "../lib/firebaseClient";

/**
 * Firestore schema for whiteboard documents.
 * Collection: "whiteboards"
 * Document ID: ${userId}_${noteId} or ${userId}_default
 *
 * NOTE: If we start embedding large images, we may need to move image blobs
 * to Cloud Storage and keep only references here to avoid hitting the 1 MB doc size limit.
 */
export interface WhiteboardDoc {
    userId: string; // Firebase Auth uid
    noteId?: string | null; // note ID if attached to a specific note
    title?: string; // optional display name
    sceneVersion: number; // start with 1 for future migrations
    scene: {
        elements: any[]; // ExcalidrawElement[]
        appState: Record<string, any>;
        files: Record<string, any>; // Excalidraw binary files map
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Scene data structure (what we pass to/from Excalidraw)
 */
export interface SceneData {
    elements: any[];
    appState: any;
    files: Record<string, any>;
}

/**
 * Recursively convert Map objects to plain objects for Firestore serialization.
 * Firebase doesn't support Map objects, so we need to convert them.
 */
function serializeForFirestore(obj: any): any {
    if (obj === undefined) {
        return null;
    }
    if (obj === null) {
        return null;
    }

    // Convert Map to plain object
    if (obj instanceof Map) {
        const plainObj: Record<string, any> = {};
        obj.forEach((value, key) => {
            plainObj[String(key)] = serializeForFirestore(value);
        });
        return plainObj;
    }

    // Convert Set to array
    if (obj instanceof Set) {
        return Array.from(obj).map(serializeForFirestore);
    }

    // Recursively handle arrays
    if (Array.isArray(obj)) {
        return obj.map(serializeForFirestore);
    }

    // Recursively handle plain objects
    if (typeof obj === "object" && obj.constructor === Object) {
        const plainObj: Record<string, any> = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                plainObj[key] = serializeForFirestore(obj[key]);
            }
        }
        return plainObj;
    }

    // Return primitives and other types as-is
    return obj;
}

/**
 * Get the Firestore document reference for a whiteboard.
 * @param userId - Firebase Auth user ID
 * @param noteId - Optional note ID if attached to a specific note
 * @returns Firestore document reference
 */
export function getWhiteboardDocRef(userId: string, noteId?: string) {
    const id = noteId ? `${userId}_${noteId}` : `${userId}_default`;
    return doc(firebaseDb, "whiteboards", id);
}

/**
 * Convert Firestore data back to Excalidraw-compatible format.
 * Specifically, restore Map objects that were converted to plain objects.
 */
function deserializeFromFirestore(data: any): any {
    if (!data) return data;

    // Create a deep copy or modify in place? 
    // Since we just fetched it from Firestore, we can modify it.

    // Restore appState.collaborators to Map
    if (data.appState?.collaborators && !(data.appState.collaborators instanceof Map)) {
        const collaboratorsMap = new Map();
        Object.entries(data.appState.collaborators).forEach(([key, value]) => {
            collaboratorsMap.set(key, value);
        });

        // We need to ensure we're not mutating a read-only object if it came from some cache, 
        // but typically docSnap.data() returns a fresh object.
        // To be safe, we can shallow copy appState.
        data.appState = {
            ...data.appState,
            collaborators: collaboratorsMap
        };
    }

    return data;
}

/**
 * Load a whiteboard scene from Firestore.
 * @param userId - Firebase Auth user ID
 * @param noteId - Optional note ID if attached to a specific note
 * @returns Scene data or null if whiteboard doesn't exist
 */
export async function loadWhiteboard(
    userId: string,
    noteId?: string
): Promise<SceneData | null> {
    try {
        const docRef = getWhiteboardDocRef(userId, noteId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as WhiteboardDoc;
            return deserializeFromFirestore(data.scene);
        }
        return null;
    } catch (error) {
        console.error("Error loading whiteboard:", error);
        return null;
    }
}

/**
 * Save a whiteboard scene to Firestore.
 * @param userId - Firebase Auth user ID
 * @param sceneData - Scene data from Excalidraw
 * @param noteId - Optional note ID if attached to a specific note
 */
export async function saveWhiteboard(
    userId: string,
    sceneData: SceneData,
    noteId?: string
): Promise<void> {
    try {
        const docRef = getWhiteboardDocRef(userId, noteId);

        // Serialize the scene data to convert Map objects to plain objects
        const serializedScene = serializeForFirestore(sceneData);

        const whiteboardData: Partial<WhiteboardDoc> = {
            userId,
            noteId: noteId ?? null,
            sceneVersion: 1,
            scene: serializedScene,
            updatedAt: serverTimestamp() as Timestamp,
        };

        // Check if document exists to set createdAt only on first save
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            whiteboardData.createdAt = serverTimestamp() as Timestamp;
        }

        await setDoc(docRef, whiteboardData, { merge: true });
    } catch (error) {
        console.error("Error saving whiteboard:", error);
        throw error;
    }
}
