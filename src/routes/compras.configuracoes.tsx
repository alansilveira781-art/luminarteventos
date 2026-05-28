import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { COMPRA_STATUSES } from "@/lib/compras";
import { StatusDefaultsTable } from "@/components/StatusDefaultsTable";

export const Route = createFileRoute("/compras/configuracoes")({
  component: ComprasConfiguracoes,
});

function ComprasConfiguracoes() {
  const { isAdmin, modulos } = useAuth();
  const isComprasAdmin = isAdmin || modulos.some((m) => m.slug === "compras" && m.is_admin);
  if (!isComprasAdmin) return <Navigate to="/compras" />;

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Defina o responsável padrão de cada status do quadro de compras. Ao mover um card para um status com padrão configurado, o responsável é atribuído automaticamente."
      />
      <StatusDefaultsTable
        tableName="compras_status_defaults"
        moduleSlug="compras"
        statuses={COMPRA_STATUSES as unknown as { key: string; label: string; color: string }[]}
      />
    </>
  );
}
