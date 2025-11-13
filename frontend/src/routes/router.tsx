import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { NotesPage } from "../pages/notes/NotesPage";
import { FlashcardsPage } from "../pages/flashcards/FlashcardsPage";
import { DocumentsPage } from "../pages/documents/DocumentsPage";
import { PomodoroPage } from "../pages/pomodoro/PomodoroPage";
import { SettingsPage } from "../pages/settings/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "notes", element: <NotesPage /> },
      { path: "flashcards", element: <FlashcardsPage /> },
      { path: "documents", element: <DocumentsPage /> },
      { path: "pomodoro", element: <PomodoroPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
