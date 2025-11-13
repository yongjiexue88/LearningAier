import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./routes/router";
import { supabaseConnectionInfo } from "./lib/supabaseClient";
import { AuthProvider } from "./providers/AuthProvider";

function App() {
  useEffect(() => {
    console.info("✅ Backend connection configured", supabaseConnectionInfo);
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
