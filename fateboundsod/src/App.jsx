import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { pagesConfig } from "./pages.config";

import LoginPage from "@/pages/LoginPage";
import RequireProfile from "@/components/auth/RequireProfile";

const { Pages } = pagesConfig;

/*
|--------------------------------------------------------------------------
| Routes that require BOTH auth + profile
|--------------------------------------------------------------------------
*/
function AuthedRoutes() {
  return (
    <Routes>
      {/* Main landing page */}
      <Route path="/" element={<Pages.TCGMainMenu />} />

      {/* All app pages except Login/Profile */}
      {Object.entries(Pages)
        .filter(([key]) => key !== "LoginPage" && key !== "Profile" && key !== "TCGMainMenu")
        .map(([key, Component]) => (
          <Route key={key} path={`/${key}`} element={<Component />} />
        ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/*
|--------------------------------------------------------------------------
| Top-level routing logic
|--------------------------------------------------------------------------
*/
function AppRoutes() {
  const { user, loading } = useAuth();

  // Wait for Supabase session check
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | NOT SIGNED IN → force login everywhere
  |--------------------------------------------------------------------------
  */
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SIGNED IN → allow Profile without profile row
  | Everything else requires profile
  |--------------------------------------------------------------------------
  */
  return (
    <Routes>
      {/* Profile page is allowed when signed in */}
      <Route path="/Profile" element={<Pages.Profile />} />

      {/* All other pages require profile */}
      <Route
        path="*"
        element={
          <RequireProfile>
            <AuthedRoutes />
          </RequireProfile>
        }
      />
    </Routes>
  );
}

/*
|--------------------------------------------------------------------------
| App wrapper
|--------------------------------------------------------------------------
*/
export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}
