import { Box, Typography, IconButton, Button, Chip, Stack, LinearProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNewRounded";
import SchoolIcon from "@mui/icons-material/SchoolRounded";
import { useNavigate } from "react-router-dom";

interface GraphSidePanelProps {
    node: any;
    onClose: () => void;
    masteryLevel?: number; // 0-100
    relatedNoteId?: string;
}

export function GraphSidePanel({ node, onClose, masteryLevel, relatedNoteId }: GraphSidePanelProps) {
    const navigate = useNavigate();

    if (!node) return null;

    const getMasteryColor = (level: number) => {
        if (level >= 80) return "success";
        if (level >= 50) return "warning";
        return "error";
    };

    return (
        <Box
            sx={{
                position: "absolute",
                top: 16,
                right: 16,
                bottom: 16,
                width: 320,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 3,
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2, display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid", borderColor: "divider" }}>
                <Box>
                    <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1.2, mb: 0.5 }}>
                        {node.label}
                    </Typography>
                    <Chip
                        label={node.type}
                        size="small"
                        color={node.type === "concept" ? "primary" : "default"}
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.7rem" }}
                    />
                </Box>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Content */}
            <Box sx={{ p: 2, flexGrow: 1, overflowY: "auto" }}>

                {/* Mastery Section */}
                {masteryLevel !== undefined && (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                MASTERY LEVEL
                            </Typography>
                            <Typography variant="caption" fontWeight={600} color={`${getMasteryColor(masteryLevel)}.main`}>
                                {Math.round(masteryLevel)}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={masteryLevel}
                            color={getMasteryColor(masteryLevel)}
                            sx={{ height: 6, borderRadius: 3 }}
                        />
                    </Box>
                )}

                {/* Summary Section (Placeholder for now) */}
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Summary
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {node.summary || "No summary available for this concept. Generate more notes to enrich the knowledge graph."}
                </Typography>

                {/* Connections */}
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Connections
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Connected to {node.neighbors?.length || 0} other concepts.
                </Typography>
            </Box>

            {/* Actions Footer */}
            <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "grey.50" }}>
                <Stack spacing={1}>
                    {relatedNoteId && (
                        <Button
                            variant="contained"
                            fullWidth
                            startIcon={<OpenInNewIcon />}
                            onClick={() => navigate(`/notes/${relatedNoteId}`)}
                        >
                            Open Note
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<SchoolIcon />}
                        onClick={() => navigate("/flashcards")}
                    >
                        Review Flashcards
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
}
