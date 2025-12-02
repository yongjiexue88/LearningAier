import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./routes/router";
import { backendConnectionInfo } from "./lib/firebaseClient";
import { AuthProvider } from "./providers/AuthProvider";

function App() {
  useEffect(() => {
    // Display comprehensive configuration information
    console.log(
      "%c🚀 LearningAier Configuration ",
      "background: #4CAF50; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;"
    );
    console.group("Environment Details");
    console.log(`📍 Mode: %c${backendConnectionInfo.mode}`, "color: #2196F3; font-weight: bold");
    console.log(`🔗 Backend URL: %c${backendConnectionInfo.apiBaseUrl}`, "color: #FF9800; font-weight: bold");
    console.log(`🗄️  Database: %cFirestore (${backendConnectionInfo.projectId})`, "color: #9C27B0; font-weight: bold");
    console.log(`💾 Storage Bucket: %c${backendConnectionInfo.storageBucket}`, "color: #F44336; font-weight: bold");
    console.log(`⏰ Initialized: ${backendConnectionInfo.generatedAt}`);
    console.groupEnd();

    console.group("Available Backend Environments");
    console.log(`🌐 Default: %c${import.meta.env.VITE_API_BASE_URL || 'Not set'}`, "color: #607D8B; font-weight: bold");
    console.log(`⚗️  Lab: %c${import.meta.env.VITE_API_BASE_URL_LAB || 'Not set'}`, "color: #FF9800; font-weight: bold");
    console.log(`💡 Tip: Switch environments in Settings page`);
    console.groupEnd();

    console.log(""); // Empty line for spacing
  }, []);

  return (
    <AppProviders>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppProviders>
  );
}

export default App;
