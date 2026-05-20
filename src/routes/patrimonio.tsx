import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/patrimonio")({ component: PatrimonioLayout });

function PatrimonioLayout() {
  const { isAdmin, hasModule, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin && !hasModule("patrimonio")) return <Navigate to="/" />;
  return <Outlet />;
}
