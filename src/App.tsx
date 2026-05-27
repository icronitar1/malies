import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Cantina from "@/pages/Cantina";
import Magazzino from "@/pages/Magazzino";
import Produzione from "@/pages/Produzione";
import Vendite from "@/pages/Vendite";
import Todo from "@/pages/Todo";

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-wine-200 border-t-wine-700 rounded-full animate-spin" />
          <p className="text-sm text-stone-400 font-body">Caricamento…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cantina" element={<Cantina />} />
        <Route path="/magazzino" element={<Magazzino />} />
        <Route path="/produzione" element={<Produzione />} />
        <Route path="/vendite" element={<Vendite />} />
        <Route path="/todo" element={<Todo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
