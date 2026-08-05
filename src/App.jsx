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
import Cultos from "./pages/Cultos";
import { ThemeProvider } from "./lib/ThemeContext";
import { INFORMACOES_APLICATIVOS_PATH, INFORMACOES_CONTATO_PATH, AGENDA_PATH } from "@/lib/postsNavPath";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import EventoPage from "./pages/EventoPage";
import EventosRotinasAgendar from "./pages/EventosRotinasAgendar";
import PostsGrupoPage from "./pages/PostsGrupoPage";
import Postagens from "./pages/Postagens";
import Informacoes from "./pages/Informacoes";
import PostsCategoriaPage from "./pages/PostsCategoriaPage";
import PostagemEditor from "./pages/PostagemEditor";
import PostPage from "./pages/PostPage";
import AcceptInvite from "./pages/AcceptInvite";
import Historia from "./pages/Historia";
import Agenda from "./pages/Agenda";
import AdminRoute from "./components/AdminRoute";
import { LAST_VISITED_PATH_KEY } from "@/lib/lastPath";

function RedirectLegacyPostagensEdit() {
  const { id } = useParams();
  return <Navigate to={`/Eventos/editar/${id}`} replace />;
}

function RedirectLegacyPostsPath() {
  const location = useLocation();
  const rest = location.pathname.replace(/^\/Posts\/?/, "");
  const target = rest ? `/Eventos/${rest}` : "/Eventos";
  return <Navigate to={`${target}${location.search}`} replace />;
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

  // Não desmontar rotas autenticadas durante revalidação de sessão (ex.: após
  // fechar o seletor de ficheiros) — isso apagava estado em memória (wizard, etc.).
  if (isLoadingAuth || isLoadingPublicSettings) {
    return <RouteSkeleton />;
  }

  if (isValidatingSession && !isAuthenticated) {
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
        <Route path="Cultos" element={<Cultos />} />
        <Route path="Contato" element={<Navigate to={INFORMACOES_CONTATO_PATH} replace />} />
        <Route path="Recursos" element={<Navigate to={INFORMACOES_APLICATIVOS_PATH} replace />} />
        <Route
          path="LinksUteis"
          element={<Navigate to={INFORMACOES_APLICATIVOS_PATH} replace />}
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
        <Route path="Eventos/rotinas/agendar/:id" element={<AdminRoute><EventosRotinasAgendar /></AdminRoute>} />
        <Route path="Eventos/rotinas/agendar" element={<AdminRoute><EventosRotinasAgendar /></AdminRoute>} />
        <Route
          path="Eventos/rotinas"
          element={<Navigate to={`${AGENDA_PATH}?tab=configuracoes`} replace />}
        />
        <Route
          path="Eventos/novo-evento"
          element={
            <Navigate
              to={`${AGENDA_PATH}?tab=eventos&novo=1`}
              replace
            />
          }
        />
        <Route
          path="Eventos/nova"
          element={
            <PrivateRoute>
              <PostagemEditor />
            </PrivateRoute>
          }
        />
        <Route
          path="Eventos/editar/:id"
          element={
            <PrivateRoute>
              <PostagemEditor />
            </PrivateRoute>
          }
        />
        <Route path="Eventos/grupo/:grupo" element={<PostsGrupoPage />} />
        <Route path="Eventos/categoria/:categoria" element={<PostsCategoriaPage />} />
        <Route path="Informacoes/categoria/:categoria" element={<PostsCategoriaPage />} />
        <Route path="Informacoes" element={<Informacoes />} />
        <Route path="Eventos" element={<Postagens />} />
        <Route path="Posts/*" element={<RedirectLegacyPostsPath />} />
        <Route path="Postagens/nova" element={<Navigate to="/Eventos/nova" replace />} />
        <Route
          path="Postagens/editar/:id"
          element={<RedirectLegacyPostagensEdit />}
        />
        <Route path="Postagens" element={<Navigate to="/Eventos" replace />} />
        <Route path="Post/:id" element={<PostPage />} />
        <Route path="Historia" element={<Historia />} />
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
