import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/SpaceDashboardRounded";
import NotesIcon from "@mui/icons-material/DescriptionRounded";
import FlashcardIcon from "@mui/icons-material/StyleRounded";
import DocumentIcon from "@mui/icons-material/PictureAsPdfRounded";
import PomodoroIcon from "@mui/icons-material/TimerRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import { NavLink } from "react-router-dom";

const workspaceItems = [
  { label: "Dashboard", icon: <DashboardIcon />, to: "/" },
  { label: "Notes", icon: <NotesIcon />, to: "/notes", primary: true },
  { label: "Flashcards", icon: <FlashcardIcon />, to: "/flashcards" },
  { label: "Documents", icon: <DocumentIcon />, to: "/documents" },
];

const toolItems = [
  { label: "Pomodoro & Tasks", icon: <PomodoroIcon />, to: "/pomodoro" },
  { label: "Settings", icon: <SettingsIcon />, to: "/settings" },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  return (
    <Box
      sx={{
        width: 260,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Study Assistant
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bilingual AI-powered study workspace
        </Typography>
      </Stack>
      <Divider />
      <Stack spacing={3} sx={{ p: 2 }}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
            Workspace
          </Typography>
          <List disablePadding>
            {workspaceItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                onClick={onNavigate}
                sx={{
                  borderRadius: 10,
                  px: 1.5,
                  mt: 0.5,
                  "& .MuiListItemIcon-root": {
                    color: item.primary ? "primary.main" : "text.secondary",
                  },
                  "&.active": {
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    "& .MuiListItemIcon-root": {
                      color: "primary.contrastText",
                    },
                    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, mr: 0.5 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{
                    fontWeight: item.primary ? 700 : 600,
                    fontSize: "0.95rem",
                  }}
                  primary={item.label}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
            Tools
          </Typography>
          <List disablePadding>
            {toolItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                onClick={onNavigate}
                sx={{
                  borderRadius: 10,
                  px: 1.5,
                  mt: 0.5,
                  "& .MuiListItemIcon-root": {
                    color: "text.secondary",
                  },
                  "&.active": {
                    backgroundColor: "action.hover",
                    "& .MuiListItemIcon-root": {
                      color: "primary.main",
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, mr: 0.5 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{
                    fontWeight: 600,
                    fontSize: "0.95rem",
                  }}
                  primary={item.label}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Stack>
    </Box>
  );
}

export function Sidebar() {
  return (
    <Box
      component="aside"
      sx={{
        width: 260,
        borderRight: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        position: "sticky",
        top: 0,
        height: "100vh",
        display: { xs: "none", md: "block" },
      }}
    >
      <SidebarContent />
    </Box>
  );
}
