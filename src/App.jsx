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
import { EditModeProvider } from "@/lib/EditModeContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import AppErrorBoundary from "@/components/shared/AppErrorBoundary";

import Layout from "./components/layout/Layout";
import RouteSkeleton from "@/components/shared/RouteSkeleton";
import Home from "./pages/Home";
import { ThemeProvider } from "./lib/ThemeContext";
import Recursos from "./pages/Recursos";
import Agenda from "./pages/Agenda.jsx";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import EventoPage from "./pages/EventoPage";
import Eventos from "./pages/Eventos";
import EventosRotinas from "./pages/EventosRotinas";
import EventosRotinasAgendar from "./pages/EventosRotinasAgendar";
import Postagens from "./pages/Postagens";
import PostagemEditor from "./pages/PostagemEditor";
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
    return <RouteSkeleton />;
  }

  if (!isAuthenticated) {
    return <RouteSkeleton />;
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
  return <RouteSkeleton />;
}

const AppRoutes = () => {
  const { isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    if (authError?.type === "auth_required") {
      navigateToLogin();
    }
  }, [authError, navigateToLogin]);

  if (isLoadingPublicSettings) {
    return <RouteSkeleton />;
  }

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  if (authError?.type === "auth_required") {
    return <RouteSkeleton />;
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
        <Route
          path="LinksUteis"
          element={<Navigate to="/Recursos" replace />}
        />
        <Route path="Agenda" element={<Agenda />} />

        <Route
          path="Dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="Admin"
          element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          }
        />
        <Route path="Evento/:id" element={<EventoPage />} />
        <Route path="Eventos" element={<Eventos />} />
        <Route path="Eventos/rotinas" element={<EventosRotinas />} />
        <Route path="Eventos/rotinas/agendar/:id" element={<EventosRotinasAgendar />} />
        <Route path="Eventos/rotinas/agendar" element={<EventosRotinasAgendar />} />
        <Route
          path="Postagens/nova"
          element={
            <PrivateRoute>
              <PostagemEditor />
            </PrivateRoute>
          }
        />
        <Route
          path="Postagens/editar/:id"
          element={
            <PrivateRoute>
              <PostagemEditor />
            </PrivateRoute>
          }
        />
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
            <EditModeProvider>
              <TooltipProvider delayDuration={300}>
                <NativeTitleLifetime />
                <TrackLastVisitedPath />
                <AppErrorBoundary>
                  <AppRoutes />
                </AppErrorBoundary>
              </TooltipProvider>
              <Toaster />
            </EditModeProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
