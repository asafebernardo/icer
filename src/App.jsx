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
} from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import { ThemeProvider } from "./lib/ThemeContext";
import Recursos from "./pages/Recursos";
import Agenda from "./pages/Agenda.jsx";
import Dashboard from "./pages/Dashboard";
import EventoPage from "./pages/EventoPage";
import Eventos from "./pages/Eventos";
import Postagens from "./pages/Postagens";
import Login from "./pages/Login";

// Wrapper que protege rotas privadas — redireciona ao login se não autenticado
const PrivateRoute = ({ children }) => {
  const {
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    navigateToLogin,
  } = useAuth();

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  return children;
};

const AppRoutes = () => {
  const { isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
    // Para outros erros de auth (ex: app privado), redireciona ao login
    if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Home" replace />} />

      {/* LOGIN FORA DO LAYOUT */}
      <Route path="/login" element={<Login />} />

      <Route element={<Layout />}>
        {/* públicas */}
        <Route path="/Home" element={<Home />} />
        <Route path="/Recursos" element={<Recursos />} />
        <Route path="/Agenda" element={<Agenda />} />

        {/* Área autenticada: perfil para todos; separador Membros só para admin */}
        <Route
          path="/Dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/Evento/:id" element={<EventoPage />} />
        <Route path="/Eventos" element={<Eventos />} />
        <Route path="/Postagens" element={<Postagens />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <TooltipProvider delayDuration={300}>
            <NativeTitleLifetime />
            <Router>
              <AppRoutes />
            </Router>
          </TooltipProvider>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
