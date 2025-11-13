import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export function SettingsPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure preferred LLM provider, model, and language defaults. These map to the
          `profiles` table in Supabase.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField select label="LLM Provider" fullWidth>
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="gemini">Google Gemini</MenuItem>
            </TextField>
            <TextField label="Model name" placeholder="gpt-4.1-mini" fullWidth />
            <TextField label="Preferred language" placeholder="Auto-detect" fullWidth />
            <Button variant="contained">Save settings</Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
