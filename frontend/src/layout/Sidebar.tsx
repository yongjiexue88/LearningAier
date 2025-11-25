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
import ChatIcon from "@mui/icons-material/ChatRounded";
import DrawIcon from "@mui/icons-material/DrawRounded";

const workspaceItems = [
  { label: "Dashboard", icon: <DashboardIcon />, to: "/" },
  { label: "Notes", icon: <NotesIcon />, to: "/notes", primary: true },
  { label: "Flashcards", icon: <FlashcardIcon />, to: "/flashcards" },
  { label: "Documents", icon: <DocumentIcon />, to: "/documents" },
  { label: "Knowledge Graph", icon: <HubIcon />, to: "/graph" },
  { label: "AI Chat", icon: <ChatIcon />, to: "/chat" },
  { label: "Whiteboard", icon: <DrawIcon />, to: "/whiteboard" },
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
        bgcolor: "background.paper",
      }}
    >
      <Stack
        spacing={1}
        sx={{ p: 2, pb: 1.5, alignItems: "flex-start" }}
        direction="row"
        justifyContent="space-between"
      >
        {!collapsed && (
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={600} sx={{ fontSize: "1.125rem" }}>
              Study Assistant
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
              AI-powered study workspace
            </Typography>
          </Stack>
        )}
        <IconButton
          size="small"
          onClick={onToggleCollapse}
          sx={{
            ml: "auto",
            color: "text.secondary",
            "&:hover": {
              color: "primary.main",
              bgcolor: "action.hover",
            }
          }}
        >
          {collapsed ? <MenuOpenIcon fontSize="small" /> : <CloseIcon fontSize="small" />}
        </IconButton>
      </Stack>
      <Divider sx={{ borderColor: "divider" }} />
      <Stack spacing={3} sx={{ p: 2, flexGrow: 1, overflow: "auto" }}>
        <Box>
          {!collapsed && (
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{
                letterSpacing: 0.8,
                fontSize: "0.6875rem",
                fontWeight: 600,
                px: 1.5,
              }}
            >
              Workspace
            </Typography>
          )}
          <List disablePadding sx={{ mt: collapsed ? 0 : 0.5 }}>
            {workspaceItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                onClick={onNavigate}
                sx={{
                  borderRadius: 2,
                  px: collapsed ? 1 : 1.5,
                  py: 1,
                  mt: 0.5,
                  minHeight: 40,
                  "& .MuiListItemIcon-root": {
                    color: "text.secondary",
                    minWidth: collapsed ? 0 : 36,
                  },
                  "&.active": {
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    "& .MuiListItemIcon-root": {
                      color: "primary.contrastText",
                    },
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.2)",
                  },
                  "&:hover:not(.active)": {
                    backgroundColor: "action.hover",
                    "& .MuiListItemIcon-root": {
                      color: "primary.main",
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, mr: collapsed ? 0 : 1.5 }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primaryTypographyProps={{
                      fontWeight: item.primary ? 600 : 500,
                      fontSize: "0.9375rem",
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
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{
                letterSpacing: 0.8,
                fontSize: "0.6875rem",
                fontWeight: 600,
                px: 1.5,
              }}
            >
              Tools
            </Typography>
          )}
          <List disablePadding sx={{ mt: collapsed ? 0 : 0.5 }}>
            {toolItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                onClick={onNavigate}
                sx={{
                  borderRadius: 2,
                  px: collapsed ? 1 : 1.5,
                  py: 1,
                  mt: 0.5,
                  minHeight: 40,
                  "& .MuiListItemIcon-root": {
                    color: "text.secondary",
                  },
                  "&.active": {
                    backgroundColor: "action.selected",
                    color: "primary.main",
                    "& .MuiListItemIcon-root": {
                      color: "primary.main",
                    },
                  },
                  "&:hover:not(.active)": {
                    backgroundColor: "action.hover",
                    "& .MuiListItemIcon-root": {
                      color: "primary.main",
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, mr: collapsed ? 0 : 1.5 }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primaryTypographyProps={{
                      fontWeight: 500,
                      fontSize: "0.9375rem",
                    }}
                    primary={item.label}
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Stack>

      <Box sx={{ p: collapsed ? 1.5 : 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Stack
          direction={collapsed ? "column" : "row"}
          spacing={collapsed ? 0.5 : 1.5}
          alignItems="center"
          justifyContent={collapsed ? "center" : "space-between"}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton
              onClick={(e) => setAccountAnchor(e.currentTarget)}
              sx={{
                p: 0.5,
                "&:hover": {
                  "& .MuiAvatar-root": {
                    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.1)",
                  }
                }
              }}
            >
              <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: "0.875rem", fontWeight: 600 }}>
                {initials}
              </Avatar>
            </IconButton>
            {!collapsed && (
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.875rem" }}>
                  {user?.displayName ?? user?.email ?? "User"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
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
          sx={{
            "& .MuiPaper-root": {
              borderRadius: 2,
              minWidth: 200,
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.1)",
            },
          }}
        >
          <MenuItem disabled>
            <Stack>
              <Typography variant="body2" fontWeight={600}>
                {user?.displayName ?? "Account"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Stack>
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            component={NavLink}
            to="/settings"
            onClick={() => {
              setAccountAnchor(null);
              onNavigate?.();
            }}
            sx={{
              borderRadius: 1,
              mx: 0.5,
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <SettingsIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
            Settings
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAccountAnchor(null);
              void signOut();
            }}
            sx={{
              borderRadius: 1,
              mx: 0.5,
              color: "error.main",
              "&:hover": {
                bgcolor: "rgba(239, 68, 68, 0.04)",
              },
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
