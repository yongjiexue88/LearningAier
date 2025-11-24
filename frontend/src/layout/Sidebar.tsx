import {
  Avatar,
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/SpaceDashboardRounded";
import NotesIcon from "@mui/icons-material/DescriptionRounded";
import FlashcardIcon from "@mui/icons-material/StyleRounded";
import DocumentIcon from "@mui/icons-material/PictureAsPdfRounded";
import PomodoroIcon from "@mui/icons-material/TimerRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import MenuOpenIcon from "@mui/icons-material/MenuOpenRounded";
import { NavLink } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useState } from "react";

import HubIcon from "@mui/icons-material/HubRounded";

const workspaceItems = [
  { label: "Dashboard", icon: <DashboardIcon />, to: "/" },
  { label: "Notes", icon: <NotesIcon />, to: "/notes", primary: true },
  { label: "Flashcards", icon: <FlashcardIcon />, to: "/flashcards" },
  { label: "Documents", icon: <DocumentIcon />, to: "/documents" },
  { label: "Knowledge Graph", icon: <HubIcon />, to: "/graph" },
];

const toolItems = [{ label: "Pomodoro & Tasks", icon: <PomodoroIcon />, to: "/pomodoro" }];

interface SidebarContentProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function SidebarContent({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: SidebarContentProps) {
  const { user, signOut } = useAuth();
  const initials =
    user?.email?.split("@")[0].slice(0, 2).toUpperCase() ?? "SA";
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box
      sx={{
        width: collapsed ? 88 : 260,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
      }}
    >
      <Stack
        spacing={1}
        sx={{ p: 2, pb: 1, alignItems: "flex-start" }}
        direction="row"
        justifyContent="space-between"
      >
        {!collapsed && (
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={700}>
              Study Assistant
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bilingual AI-powered study workspace
            </Typography>
          </Stack>
        )}
        <IconButton size="small" onClick={onToggleCollapse} sx={{ ml: "auto" }}>
          {collapsed ? <MenuOpenIcon /> : <CloseIcon />}
        </IconButton>
      </Stack>
      <Divider />
      <Stack spacing={3} sx={{ p: 2, flexGrow: 1, overflow: "auto" }}>
        <Box>
          {!collapsed && (
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
              Workspace
            </Typography>
          )}
          <List disablePadding>
            {workspaceItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                onClick={onNavigate}
                sx={{
                  borderRadius: 10,
                  px: collapsed ? 0.5 : 1.5,
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
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, mr: collapsed ? 0 : 0.5 }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primaryTypographyProps={{
                      fontWeight: item.primary ? 700 : 600,
                      fontSize: "0.95rem",
                    }}
                    primary={item.label}
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        </Box>

        <Box>
          {!collapsed && (
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
              Tools
            </Typography>
          )}
          <List disablePadding>
            {toolItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                onClick={onNavigate}
                sx={{
                  borderRadius: 10,
                  px: collapsed ? 0.5 : 1.5,
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
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, mr: collapsed ? 0 : 0.5 }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primaryTypographyProps={{
                      fontWeight: 600,
                      fontSize: "0.95rem",
                    }}
                    primary={item.label}
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Stack>

      <Box sx={{ p: collapsed ? 1 : 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Stack
          direction={collapsed ? "column" : "row"}
          spacing={collapsed ? 0.5 : 1}
          alignItems="center"
          justifyContent={collapsed ? "center" : "space-between"}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={(e) => setAccountAnchor(e.currentTarget)}
              sx={{ p: 0.5 }}
            >
              <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                {initials}
              </Avatar>
            </IconButton>
            {!collapsed && (
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  {user?.displayName ?? user?.email ?? "User"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            )}
          </Stack>
        </Stack>
        <Menu
          anchorEl={accountAnchor}
          open={Boolean(accountAnchor)}
          onClose={() => setAccountAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <MenuItem disabled>
            <Stack>
              <Typography variant="body2" fontWeight={700}>
                {user?.displayName ?? "Account"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Stack>
          </MenuItem>
          <Divider />
          <MenuItem
            component={NavLink}
            to="/settings"
            onClick={() => {
              setAccountAnchor(null);
              onNavigate?.();
            }}
          >
            <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAccountAnchor(null);
              void signOut();
            }}
          >
            Sign out
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  return (
    <Box
      component="aside"
      sx={{
        width: collapsed ? 88 : 260,
        borderRight: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        position: "sticky",
        top: 0,
        height: "100vh",
        display: { xs: "none", md: "block" },
        transition: "width 0.2s ease",
      }}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </Box>
  );
}
