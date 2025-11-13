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

const navItems = [
  { label: "Dashboard", icon: <DashboardIcon />, to: "/" },
  { label: "Notes", icon: <NotesIcon />, to: "/notes" },
  { label: "Flashcards", icon: <FlashcardIcon />, to: "/flashcards" },
  { label: "Documents", icon: <DocumentIcon />, to: "/documents" },
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
      <List disablePadding>
        {navItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            onClick={onNavigate}
            sx={{
              borderRadius: 0,
              "&.active": {
                backgroundColor: "action.selected",
                borderLeft: "4px solid",
                borderColor: "primary.main",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
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
