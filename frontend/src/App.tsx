import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmailView from "./pages/EmailView";
import QueueDashboard from "./pages/QueueDashboard";
import { AuthProvider, useAuth } from "./components/AuthContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} color="#10B981" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public ─────────────────────────────────────── */}
          <Route path="/login" element={<Login />} />

          {/* ── App shell with sidebar ─────────────────────── */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/scheduled" element={<Dashboard />} />
            <Route path="/sent" element={<Dashboard />} />
            <Route path="/email/:id" element={<EmailView />} />
            <Route path="/queue" element={<QueueDashboard />} />
          </Route>

          {/* ── Fallback redirect ──────────────────────────── */}
          <Route path="*" element={<Navigate to="/scheduled" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
