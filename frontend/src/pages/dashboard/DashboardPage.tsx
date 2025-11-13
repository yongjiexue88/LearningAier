import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
} from "@mui/material";

const quickActions = [
  { label: "New Note", description: "Start typing bilingual notes" },
  { label: "Upload PDF", description: "Import and summarize a document" },
  { label: "Review Flashcards", description: "Stay on top of spaced rep" },
];

export function DashboardPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Quick overview of your study activity and entry points into notes,
          flashcards, and focus tools.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {quickActions.map((action) => (
          <Card key={action.label}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>
                {action.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {action.description}
              </Typography>
              <Button variant="contained" size="small">
                Go
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}
