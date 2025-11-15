import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./routes/router";
import { backendConnectionInfo } from "./lib/firebaseClient";
import { AuthProvider } from "./providers/AuthProvider";

function App() {
  useEffect(() => {
    console.info("✅ Backend connection configured", backendConnectionInfo);
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
