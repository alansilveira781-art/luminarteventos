import { createFileRoute } from "@tanstack/react-router";
import { PatrimonioMovimentacoes } from "@/components/patrimonio/Movimentacoes";

export const Route = createFileRoute("/patrimonio/entradas")({
  component: () => <PatrimonioMovimentacoes tipo="entrada" titulo="Entradas de Patrimônio" descricao="Registro de retornos, aquisições e ajustes positivos" />,
});
