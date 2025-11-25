import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Typography, Chip } from "@mui/material";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useAuth } from "../../providers/AuthProvider";
import {
    loadWhiteboard,
    saveWhiteboard,
    type SceneData,
} from "../../services/whiteboardService";

export function WhiteboardPage() {
    const { id: noteId } = useParams<{ id?: string }>();
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [initialData, setInitialData] = useState<any>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Load whiteboard scene only once on mount
    useEffect(() => {
        if (!user?.uid || hasLoaded) return;

        const loadScene = async () => {
            setIsLoading(true);
            try {
                const data = await loadWhiteboard(user.uid, noteId);
                setInitialData(data || { elements: [], appState: {}, files: {} });
                setHasLoaded(true);
            } catch (error) {
                console.error("Failed to load whiteboard:", error);
                setInitialData({ elements: [], appState: {}, files: {} });
                setHasLoaded(true);
            } finally {
                setIsLoading(false);
            }
        };

        void loadScene();
    }, [user?.uid, noteId, hasLoaded]);

    // Stable onChange handler with autosave
    const handleChange = useCallback(
        (elements: readonly any[], appState: any, files: any) => {
            if (!user?.uid || !hasLoaded) return;

            const sceneData: SceneData = {
                elements: [...elements],
                appState,
                files,
            };

            // Debounced save
            const timeoutId = setTimeout(async () => {
                setIsSaving(true);
                try {
                    await saveWhiteboard(user.uid, sceneData, noteId);
                    setLastSaved(new Date());
                } catch (error) {
                    console.error("Failed to save whiteboard:", error);
                } finally {
                    setIsSaving(false);
                }
            }, 1000);

            return () => clearTimeout(timeoutId);
        },
        [user?.uid, noteId, hasLoaded]
    );

    if (!user) {
        return (
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    p: 3,
                }}
            >
                <Typography color="text.secondary">
                    Please sign in to use the whiteboard.
                </Typography>
            </Box>
        );
    }

    if (isLoading || !hasLoaded) {
        return (
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                position: "relative",
            }}
        >
            {/* Header with save status */}
            <Box
                sx={{
                    px: 3,
                    py: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "background.paper",
                }}
            >
                <Typography variant="h5" fontWeight={600}>
                    {noteId ? `Whiteboard for Note ${noteId}` : "My Whiteboard"}
                </Typography>
                <Chip
                    label={isSaving ? "Saving..." : lastSaved ? "Saved" : "Ready"}
                    size="small"
                    color={isSaving ? "default" : lastSaved ? "success" : "default"}
                    sx={{ fontWeight: 500 }}
                />
            </Box>

            {/* Excalidraw Canvas */}
            <Box
                sx={{
                    flex: 1,
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                }}
            >
                <Excalidraw
                    key={`whiteboard - ${user.uid} -${noteId || "default"} `}
                    initialData={initialData}
                    onChange={handleChange}
                />
            </Box>
        </Box>
    );
}
