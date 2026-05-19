import { createFileRoute, Outlet, Navigate, Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/contabil")({
  component: ContabilLayout,
});

const TABS = [
  { to: "/contabil", label: "Dashboard" },
  { to: "/contabil/notas", label: "Notas fiscais" },
  { to: "/contabil/consultas", label: "Consulta de impostos" },
  { to: "/contabil/configuracao", label: "Configuração" },
];

function ContabilLayout() {
  const { isAdmin, hasModule, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (loading) return null;
  if (!isAdmin && !hasModule("contabil")) return <Navigate to="/" />;

  const isActive = (to: string) => (to === "/contabil" ? pathname === "/contabil" : pathname.startsWith(to));

  return (
    <div className="space-y-4">
      <div className="border-b border-border">
        <nav className="flex flex-wrap gap-1 px-1">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={`px-4 py-2 text-sm rounded-t-md border-b-2 -mb-px transition-colors ${
                isActive(t.to)
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
