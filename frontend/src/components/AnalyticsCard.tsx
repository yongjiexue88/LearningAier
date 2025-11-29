import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
} from "@mui/material";
import {
    TrendingUp as TrendingUpIcon,
    School as SchoolIcon,
    Style as StyleIcon,
    CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { getAnalyticsOverview } from "../services/api/analytics";
import { AnalyticsOverviewResponse } from "../services/api/types";

export function AnalyticsCard() {
    const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            console.log(
                "%c🎨 ANALYTICS CARD",
                "background: #8B5CF6; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
                "\n🔄 Loading BigQuery analytics data..."
            );

            setLoading(true);
            setError(null);
            const analytics = await getAnalyticsOverview();
            setData(analytics);

            console.log(
                "%c✅ ANALYTICS CARD",
                "background: #10B981; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
                "\n📊 Data loaded and rendered successfully"
            );
        } catch (err: any) {
            console.error(
                "%c❌ ANALYTICS CARD ERROR",
                "background: #EF4444; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
                "\n",
                err
            );
            setError(err.message || "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card sx={{ mb: 4 }}>
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Loading analytics...
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card sx={{ mb: 4 }}>
                <CardContent sx={{ p: 3 }}>
                    <Alert severity="info">
                        {error || "No analytics data available yet. Start creating notes and flashcards to see your progress!"}
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const { overview, activity } = data;

    // Prepare activity data for mini chart (last 7 days)
    const recentActivity = activity.slice(0, 7).reverse();
    const maxReviews = Math.max(...recentActivity.map((a) => a.review_count), 1);

    return (
        <Card sx={{ mb: 4 }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        Study Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        BigQuery-powered insights into your learning progress
                    </Typography>
                </Box>

                {/* Stats Grid */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
                        gap: 2,
                        mb: 3,
                    }}
                >
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(59, 130, 246, 0.08)",
                            textAlign: "center",
                        }}
                    >
                        <SchoolIcon sx={{ color: "primary.main", mb: 1 }} />
                        <Typography variant="h5" fontWeight={600}>
                            {overview.total_notes}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Notes
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(139, 92, 246, 0.08)",
                            textAlign: "center",
                        }}
                    >
                        <StyleIcon sx={{ color: "#8B5CF6", mb: 1 }} />
                        <Typography variant="h5" fontWeight={600}>
                            {overview.total_flashcards}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Flashcards
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(16, 185, 129, 0.08)",
                            textAlign: "center",
                        }}
                    >
                        <TrendingUpIcon sx={{ color: "#10B981", mb: 1 }} />
                        <Typography variant="h5" fontWeight={600}>
                            {overview.total_reviews}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Reviews
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(245, 158, 11, 0.08)",
                            textAlign: "center",
                        }}
                    >
                        <CheckCircleIcon sx={{ color: "#F59E0B", mb: 1 }} />
                        <Typography variant="h5" fontWeight={600}>
                            {overview.mastery_rate_percent.toFixed(0)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Mastery
                        </Typography>
                    </Box>
                </Box>

                {/* Mini Activity Chart */}
                {recentActivity.length > 0 && (
                    <Box>
                        <Typography variant="body2" fontWeight={600} gutterBottom>
                            Review Activity (Last 7 Days)
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "flex-end",
                                gap: 1,
                                height: 80,
                                mt: 1,
                            }}
                        >
                            {recentActivity.map((day, index) => {
                                const barHeight = (day.review_count / maxReviews) * 100;
                                return (
                                    <Box
                                        key={index}
                                        sx={{
                                            flex: 1,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 0.5,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: "100%",
                                                height: `${Math.max(barHeight, 5)}%`,
                                                bgcolor: day.review_count > 0 ? "primary.main" : "#E5E7EB",
                                                borderRadius: 1,
                                                transition: "all 0.2s ease",
                                                "&:hover": {
                                                    bgcolor: day.review_count > 0 ? "primary.dark" : "#D1D5DB",
                                                    transform: "scaleY(1.05)",
                                                },
                                            }}
                                            title={`${day.review_date}: ${day.review_count} reviews`}
                                        />
                                        <Typography
                                            variant="caption"
                                            sx={{ fontSize: "0.65rem", color: "text.secondary" }}
                                        >
                                            {new Date(day.review_date).toLocaleDateString("en-US", {
                                                weekday: "short",
                                            })}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                )}

                {/* Additional Stats */}
                <Box
                    sx={{
                        mt: 3,
                        pt: 2,
                        borderTop: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        gap: 3,
                    }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Avg. Interval
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                            {overview.avg_interval.toFixed(1)} days
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Total Activity
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                            {activity.length} days tracked
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}
