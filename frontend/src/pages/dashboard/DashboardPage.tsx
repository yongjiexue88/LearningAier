import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import { AnalyticsCard } from "../../components/AnalyticsCard";

const quickActions = [
  { label: "New Note", description: "Start typing bilingual notes", path: "/notes" },
  { label: "Upload PDF", description: "Import and summarize a document", path: "/documents" },
  { label: "Review Flashcards", description: "Stay on top of spaced rep", path: "/flashcards" },
];

export function DashboardPage() {
  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Quick overview of your study activity and entry points into notes,
          flashcards, and focus tools.
        </Typography>
      </Box>

      {/* BigQuery Analytics Card */}
      <AnalyticsCard />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 3,
        }}
      >
        {quickActions.map((action) => (
          <Card
            key={action.label}
            sx={{
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 8px 16px rgba(15, 23, 42, 0.08)",
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {action.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                {action.description}
              </Typography>
              <Button
                variant="contained"
                size="medium"
                href={action.path}
                sx={{
                  borderRadius: 2,
                }}
              >
                Go
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}
