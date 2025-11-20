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
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure preferred LLM provider, model, and language defaults. These values are saved to your
          Firestore profile and used by flashcard and notes AI workflows.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={2}>
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
              label="Model name"
              placeholder="gemini-2.5-flash"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              fullWidth
              disabled={loading}
            />
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
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
