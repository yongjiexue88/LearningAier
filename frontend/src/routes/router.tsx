import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { NotesPage } from "../pages/notes/NotesPage";
import { FlashcardsPage } from "../pages/flashcards/FlashcardsPage";
import { DocumentsPage } from "../pages/documents/DocumentsPage";
import { PomodoroPage } from "../pages/pomodoro/PomodoroPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { KnowledgeGraphPage } from "../pages/graph/KnowledgeGraphPage";
import { ChatPage } from "../pages/chat/ChatPage";
import { RequireAuth } from "./RequireAuth";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "notes", element: <NotesPage /> },
          { path: "notes/:id", element: <NotesPage /> },
          { path: "flashcards", element: <FlashcardsPage /> },
          { path: "documents", element: <DocumentsPage /> },
          { path: "graph", element: <KnowledgeGraphPage /> },
          { path: "chat", element: <ChatPage /> },
          { path: "chat/:conversationId", element: <ChatPage /> },
          { path: "pomodoro", element: <PomodoroPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
