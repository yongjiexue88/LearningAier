import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseDb } from "../../lib/firebaseClient";
import { useAuth } from "../../providers/AuthProvider";

export function SettingsPage() {
  const { user } = useAuth();
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "info" | "error";
  }>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(firebaseDb, "profiles", user.uid));
        if (snap.exists()) {
          const data = snap.data() as {
            llm_provider?: string | null;
            llm_model?: string | null;
            preferred_language?: string | null;
          };
          setProvider(data.llm_provider ?? "gemini");
          setModel(data.llm_model ?? "gemini-2.5-flash");
          setPreferredLanguage(data.preferred_language ?? "");
        }
      } catch (error) {
        console.error("[settings] load profile failed", error);
        setSnackbar({
          open: true,
          message: "Unable to load settings from Firestore.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    void loadProfile();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await setDoc(
        doc(firebaseDb, "profiles", user.uid),
        {
          llm_provider: provider,
          llm_model: model,
          preferred_language: preferredLanguage || null,
        },
        { merge: true }
      );
      setSnackbar({
        open: true,
        message: "Preferences saved. New generations will use this model.",
        severity: "success",
      });
    } catch (error) {
      console.error("[settings] save profile failed", error);
      setSnackbar({
        open: true,
        message: "Failed to save settings. Check your connection and try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure preferred LLM provider, model, and language defaults. These values are saved to your
          Firestore profile and used by flashcard and notes AI workflows.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            <TextField
              select
              label="LLM Provider"
              fullWidth
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              helperText="Saved to your Firestore profile and used by flashcard/notes AI features."
              disabled={loading}
            >
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="gemini">Google Gemini</MenuItem>
            </TextField>
            <TextField
              select
              label="Model name"
              fullWidth
              value={model}
              onChange={(event) => setModel(event.target.value)}
              helperText="Select the Gemini model to use for AI tasks."
              disabled={loading}
            >
              <MenuItem value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</MenuItem>
              <MenuItem value="gemini-2.0-flash">Gemini 2.0 Flash</MenuItem>
              <MenuItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</MenuItem>
              <MenuItem value="gemini-2.5-flash-tts">Gemini 2.5 Flash TTS</MenuItem>
              <MenuItem value="gemini-2.5-flash">Gemini 2.5 Flash</MenuItem>
              <MenuItem value="gemini-2.5-pro">Gemini 2.5 Pro</MenuItem>
              <MenuItem value="gemini-3-pro">Gemini 3 Pro</MenuItem>
            </TextField>
            <TextField
              label="Preferred language"
              placeholder="Auto-detect"
              fullWidth
              value={preferredLanguage}
              onChange={(event) => setPreferredLanguage(event.target.value)}
              disabled={loading}
            />
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || loading || !user}
                sx={{ minWidth: 140 }}
              >
                {saving ? "Saving..." : "Save settings"}
              </Button>
              {loading && <CircularProgress size={20} />}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
