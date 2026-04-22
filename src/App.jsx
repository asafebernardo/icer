import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NativeTitleLifetime from "@/components/layout/NativeTitleLifetime";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import AppErrorBoundary from "@/components/shared/AppErrorBoundary";

import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import { ThemeProvider } from "./lib/ThemeContext";
import Recursos from "./pages/Recursos";
import Agenda from "./pages/Agenda.jsx";
import Dashboard from "./pages/Dashboard";
import EventoPage from "./pages/EventoPage";
import Eventos from "./pages/Eventos";
import Postagens from "./pages/Postagens";
import PostPage from "./pages/PostPage";
import AcceptInvite from "./pages/AcceptInvite";
import { LAST_VISITED_PATH_KEY } from "@/lib/lastPath";

// Rotas privadas — abre modal de login e envia para Início (efeito evita loop no render)
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, navigateToLogin } =
    useAuth();

  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;
    if (!isAuthenticated) navigateToLogin();
  }, [
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    navigateToLogin,
  ]);

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  return children;
};

function TrackLastVisitedPath() {
  const location = useLocation();
  useEffect(() => {
    const p = location.pathname + location.search;
    if (p !== "/login" && p !== "/Login") {
      sessionStorage.setItem(LAST_VISITED_PATH_KEY, p);
    }
  }, [location.pathname, location.search]);
  return null;
}

/** Links antigos para /login: abre o modal e vai para Início. */
function LoginPathRedirect() {
  const { openLoginModal } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    openLoginModal();
    navigate("/Home", { replace: true });
  }, [openLoginModal, navigate]);
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
    </div>
  );
}

const AppRoutes = () => {
  const { isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    if (authError?.type === "auth_required") {
      navigateToLogin();
    }
  }, [authError, navigateToLogin]);

  if (isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  if (authError?.type === "auth_required") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Home" replace />} />

      <Route path="/login" element={<LoginPathRedirect />} />
      <Route path="/Login" element={<LoginPathRedirect />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      <Route element={<Layout />}>
        <Route path="Home" element={<Home />} />
        <Route path="Recursos" element={<Recursos />} />
        <Route path="Agenda" element={<Agenda />} />

        <Route
          path="Dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="Admin" element={<Navigate to="/Dashboard" replace />} />
        <Route path="Evento/:id" element={<EventoPage />} />
        <Route path="Eventos" element={<Eventos />} />
        <Route path="Postagens" element={<Postagens />} />
        <Route path="Post/:id" element={<PostPage />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthProvider>
            <TooltipProvider delayDuration={300}>
              <NativeTitleLifetime />
              <TrackLastVisitedPath />
              <AppErrorBoundary>
                <AppRoutes />
              </AppErrorBoundary>
            </TooltipProvider>
            <Toaster />
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
