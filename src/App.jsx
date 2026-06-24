import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NativeTitleLifetime from "@/components/layout/NativeTitleLifetime";
import SiteBackground from "@/components/layout/SiteBackground";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  Route,
  Routes,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import AppRouter from "@/lib/AppRouter";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { EditModeProvider } from "@/lib/EditModeContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import AppErrorBoundary from "@/components/shared/AppErrorBoundary";

import Layout from "./components/layout/Layout";
import RouteSkeleton from "@/components/shared/RouteSkeleton";
import Home from "./pages/Home";
import { ThemeProvider } from "./lib/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import EventoPage from "./pages/EventoPage";
import EventosRotinasAgendar from "./pages/EventosRotinasAgendar";
import PostsGrupoPage from "./pages/PostsGrupoPage";
import Postagens from "./pages/Postagens";
import PostsCategoriaPage from "./pages/PostsCategoriaPage";
import PostagemEditor from "./pages/PostagemEditor";
import PostPage from "./pages/PostPage";
import AcceptInvite from "./pages/AcceptInvite";
import Historia from "./pages/Historia";
import AdminRoute from "./components/AdminRoute";
import { LAST_VISITED_PATH_KEY } from "@/lib/lastPath";

function RedirectLegacyPostagensEdit() {
  const { id } = useParams();
  return <Navigate to={`/Posts/editar/${id}`} replace />;
}

// Rotas privadas — inicia login Google se não houver sessão
const PrivateRoute = ({ children }) => {
  const {
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    isValidatingSession,
    navigateToLogin,
  } = useAuth();

  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings || isValidatingSession) return;
    if (!isAuthenticated) navigateToLogin();
  }, [
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    isValidatingSession,
    navigateToLogin,
  ]);

  if (isLoadingAuth || isLoadingPublicSettings || isValidatingSession) {
    return <RouteSkeleton />;
  }

  if (!isAuthenticated) {
    return <RouteSkeleton />;
  }

  return children;
};

function RootRedirect() {
  return <Navigate to="/Home" replace />;
}

function TrackLastVisitedPath() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === "/") {
      return;
    }
    const p = location.pathname + location.search;
    sessionStorage.setItem(LAST_VISITED_PATH_KEY, p);
  }, [location.pathname, location.search]);
  return null;
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
      <Route path="/" element={<RootRedirect />} />

      <Route path="/login" element={<Navigate to="/Home" replace />} />
      <Route path="/Login" element={<Navigate to="/Home" replace />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      <Route element={<Layout />}>
        <Route path="Home" element={<Home />} />
        <Route path="Recursos" element={<Navigate to="/Home#recursos" replace />} />
        <Route
          path="LinksUteis"
          element={<Navigate to="/Home#recursos" replace />}
        />
        <Route path="Agenda" element={<Navigate to="/Posts/categoria/agenda" replace />} />

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
        <Route path="Eventos" element={<Navigate to="/Posts/categoria/eventos" replace />} />
        <Route
          path="Eventos/rotinas"
          element={<Navigate to="/Posts/categoria/eventos?tab=configuracoes" replace />}
        />
        <Route path="Eventos/rotinas/agendar/:id" element={<AdminRoute><EventosRotinasAgendar /></AdminRoute>} />
        <Route path="Eventos/rotinas/agendar" element={<AdminRoute><EventosRotinasAgendar /></AdminRoute>} />
        <Route
          path="Posts/novo-evento"
          element={
            <Navigate
              to="/Posts/categoria/eventos?tab=eventos&novo=1"
              replace
            />
          }
        />
        <Route
          path="Posts/nova"
          element={
            <PrivateRoute>
              <PostagemEditor />
            </PrivateRoute>
          }
        />
        <Route
          path="Posts/editar/:id"
          element={
            <PrivateRoute>
              <PostagemEditor />
            </PrivateRoute>
          }
        />
        <Route path="Posts/grupo/:grupo" element={<PostsGrupoPage />} />
        <Route path="Posts/categoria/:categoria" element={<PostsCategoriaPage />} />
        <Route path="Posts" element={<Postagens />} />
        <Route path="Postagens/nova" element={<Navigate to="/Posts/nova" replace />} />
        <Route
          path="Postagens/editar/:id"
          element={<RedirectLegacyPostagensEdit />}
        />
        <Route path="Postagens" element={<Navigate to="/Posts" replace />} />
        <Route path="Post/:id" element={<PostPage />} />
        <Route
          path="Historia"
          element={
            <AdminRoute>
              <Historia />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AppRouter>
        <AuthProvider>
          <ThemeProvider>
            <EditModeProvider>
              <TooltipProvider delayDuration={300}>
                <SiteBackground />
                <NativeTitleLifetime />
                <TrackLastVisitedPath />
                <AppErrorBoundary>
                  <AppRoutes />
                </AppErrorBoundary>
              </TooltipProvider>
              <Toaster />
            </EditModeProvider>
          </ThemeProvider>
        </AuthProvider>
      </AppRouter>
    </QueryClientProvider>
  );
}

export default App;
