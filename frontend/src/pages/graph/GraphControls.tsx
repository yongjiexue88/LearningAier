import { Box, Paper, Typography, Switch, FormControlLabel } from "@mui/material";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrongRounded";
import WhatshotIcon from "@mui/icons-material/WhatshotRounded";

interface GraphControlsProps {
    showMastery: boolean;
    onToggleMastery: (show: boolean) => void;
    focusMode: boolean;
    onToggleFocusMode: (focus: boolean) => void;
}

export function GraphControls({ showMastery, onToggleMastery, focusMode, onToggleFocusMode }: GraphControlsProps) {
    return (
        <Paper
            elevation={2}
            sx={{
                position: "absolute",
                top: 16,
                left: 16,
                zIndex: 10,
                p: 1,
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                bgcolor: "background.paper",
            }}
        >
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600 }}>
                VIEW MODES
            </Typography>

            <FormControlLabel
                control={
                    <Switch
                        size="small"
                        checked={showMastery}
                        onChange={(e) => onToggleMastery(e.target.checked)}
                    />
                }
                label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <WhatshotIcon fontSize="small" color={showMastery ? "warning" : "disabled"} />
                        <Typography variant="body2">Mastery Heatmap</Typography>
                    </Box>
                }
                sx={{ m: 0, px: 0.5 }}
            />

            <FormControlLabel
                control={
                    <Switch
                        size="small"
                        checked={focusMode}
                        onChange={(e) => onToggleFocusMode(e.target.checked)}
                    />
                }
                label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CenterFocusStrongIcon fontSize="small" color={focusMode ? "primary" : "disabled"} />
                        <Typography variant="body2">Focus Mode</Typography>
                    </Box>
                }
                sx={{ m: 0, px: 0.5 }}
            />
        </Paper>
    );
}
