import { PropsWithChildren } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  StyledEngineProvider,
} from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient();

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563EB", // Soft saturated blue
      light: "#DBEAFE", // Very light blue for hover states
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#6B7280", // Muted gray
      light: "#F9FAFB",
    },
    background: {
      default: "#F4F5F7", // Overall app background (desk)
      paper: "#FFFFFF", // Notebook paper / cards
    },
    text: {
      primary: "#111827", // Dark gray
      secondary: "#6B7280", // Muted gray
    },
    divider: "#E5E7EB", // Subtle borders
    error: {
      main: "#EF4444",
    },
    action: {
      hover: "rgba(37, 99, 235, 0.04)", // Very subtle blue hover
      selected: "rgba(37, 99, 235, 0.08)",
    },
  },
  shape: {
    borderRadius: 10, // Default for most components
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "SF Pro Display",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ].join(","),
    h4: {
      fontSize: "1.75rem", // 28px - page titles
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: "1.25rem", // 20px - section titles
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h6: {
      fontSize: "1.125rem", // 18px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: "0.9375rem", // 15px - body text
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem", // 14px
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none", // No uppercase transforms
      fontWeight: 500,
    },
    caption: {
      fontSize: "0.8125rem", // 13px - labels/chips
      fontWeight: 500,
    },
    overline: {
      fontSize: "0.75rem", // 12px
      fontWeight: 600,
      letterSpacing: "0.5px",
    },
  },
  shadows: [
    "none",
    "0 1px 2px rgba(0, 0, 0, 0.05)", // Subtle
    "0 4px 12px rgba(15, 23, 42, 0.06)", // Soft
    "0 4px 12px rgba(15, 23, 42, 0.06)",
    "0 4px 12px rgba(15, 23, 42, 0.06)",
    "0 4px 12px rgba(15, 23, 42, 0.06)",
    "0 4px 12px rgba(15, 23, 42, 0.06)",
    "0 4px 12px rgba(15, 23, 42, 0.06)",
    "0 8px 16px rgba(15, 23, 42, 0.08)", // Medium
    "0 8px 16px rgba(15, 23, 42, 0.08)",
    "0 8px 16px rgba(15, 23, 42, 0.08)",
    "0 8px 16px rgba(15, 23, 42, 0.08)",
    "0 8px 16px rgba(15, 23, 42, 0.08)",
    "0 8px 16px rgba(15, 23, 42, 0.08)",
    "0 8px 16px rgba(15, 23, 42, 0.08)",
    "0 8px 16px rgba(15, 23, 42, 0.08)",
    "0 12px 24px rgba(15, 23, 42, 0.1)", // Deep
    "0 12px 24px rgba(15, 23, 42, 0.1)",
    "0 12px 24px rgba(15, 23, 42, 0.1)",
    "0 12px 24px rgba(15, 23, 42, 0.1)",
    "0 12px 24px rgba(15, 23, 42, 0.1)",
    "0 12px 24px rgba(15, 23, 42, 0.1)",
    "0 12px 24px rgba(15, 23, 42, 0.1)",
    "0 12px 24px rgba(15, 23, 42, 0.1)",
    "0 12px 24px rgba(15, 23, 42, 0.1)",
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Buttons use 8px
          padding: "8px 16px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        contained: {
          "&:hover": {
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.2)",
          },
        },
        outlined: {
          borderColor: "#E5E7EB",
          "&:hover": {
            borderColor: "#2563EB",
            backgroundColor: "rgba(37, 99, 235, 0.04)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Cards use 12px
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
          border: "1px solid #E5E7EB",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14, // Dialogs use 14px
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.1)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            "& fieldset": {
              borderColor: "#E5E7EB",
            },
            "&:hover fieldset": {
              borderColor: "#2563EB",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#2563EB",
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          "&.Mui-selected": {
            backgroundColor: "#2563EB",
            color: "#FFFFFF",
            "&:hover": {
              backgroundColor: "#2563EB",
            },
          },
        },
      },
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
