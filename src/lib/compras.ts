export type CompraStatus =
  | "solicitacao"
  | "analise"
  | "negada"
  | "pendente_aprovacao"
  | "aprovada"
  | "em_andamento"
  | "a_receber"
  | "finalizado";

export const COMPRA_STATUSES: { key: CompraStatus; label: string; color: string }[] = [
  { key: "solicitacao", label: "Solicitação de Compra", color: "bg-slate-500" },
  { key: "analise", label: "Análise de Compra", color: "bg-blue-500" },
  { key: "pendente_aprovacao", label: "Pendente Aprovação", color: "bg-amber-500" },
  { key: "aprovada", label: "Compras Aprovada", color: "bg-emerald-500" },
  { key: "em_andamento", label: "Compra Em Andamento", color: "bg-indigo-500" },
  { key: "a_receber", label: "Compras a Receber", color: "bg-cyan-500" },
  { key: "finalizado", label: "Finalizado", color: "bg-success" },
  { key: "negada", label: "Compras Negada", color: "bg-destructive" },
];

export const TIPO_COMPRA_OPTIONS = [
  { value: "mercadoria", label: "Mercadoria" },
  { value: "imobilizado", label: "Imobilizado" },
  { value: "servico", label: "Serviço" },
  { value: "administrativo", label: "Administrativo" },
] as const;

export type TipoCompra = typeof TIPO_COMPRA_OPTIONS[number]["value"];

export const STATUS_LABEL: Record<CompraStatus, string> = COMPRA_STATUSES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.label }),
  {} as Record<CompraStatus, string>,
);
