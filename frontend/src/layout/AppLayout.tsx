import {
  Box,
  Drawer,
  IconButton,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/MenuRounded";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, SidebarContent } from "./Sidebar";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const toggleDrawer = () => {
    setMobileOpen((prev) => !prev);
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
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          onNavigate={toggleDrawer}
        />
      </Drawer>

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      <Box component="section" sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 4 },
            position: "relative",
          }}
        >
          <IconButton
            color="inherit"
            onClick={toggleDrawer}
            sx={{
              display: { md: "none" },
              position: "fixed",
              top: 12,
              left: 12,
              zIndex: 1200,
              bgcolor: "background.paper",
              boxShadow: 1,
            }}
          >
            <MenuIcon />
          </IconButton>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
