import MenuIcon from "@mui/icons-material/MenuRounded";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneRounded";
import LogoutIcon from "@mui/icons-material/LogoutRounded";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, SidebarContent } from "./Sidebar";
import { useAuth } from "../providers/AuthProvider";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, signOut } = useAuth();

  const initials = useMemo(() => {
    if (!user?.email) return "SA";
    return user.email
      .split("@")[0]
      .slice(0, 2)
      .toUpperCase();
  }, [user?.email]);

  const toggleDrawer = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleSignOut = async () => {
    await signOut();
    handleMenuClose();
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={toggleDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 260,
          },
        }}
      >
        <SidebarContent onNavigate={toggleDrawer} />
      </Drawer>

      <Sidebar />

      <Box component="section" sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          elevation={1}
          color="inherit"
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
          }}
        >
          <Toolbar sx={{ gap: 2, minHeight: 72 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleDrawer}
              sx={{ display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Study Assistant
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Bilingual AI-powered study workspace
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Tooltip title="Notifications">
                <IconButton color="default">
                  <NotificationsIcon />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ cursor: "pointer" }}
                onClick={handleMenuOpen}
              >
                <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
                  {initials}
                </Avatar>
                <Stack spacing={0} sx={{ display: { xs: "none", sm: "flex" } }}>
                  <Typography variant="body2" fontWeight={700}>
                    {user?.displayName ?? user?.email ?? "User"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Stack>
              </Stack>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem disabled dense>
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
                <MenuItem onClick={handleMenuClose}>
                  <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
                  Account settings
                </MenuItem>
                <MenuItem onClick={handleSignOut}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  Sign out
                </MenuItem>
              </Menu>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
