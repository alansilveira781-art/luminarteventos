import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/dados")({
  component: DadosPage,
});

const TABLES = [
  "itens", "categorias", "fornecedores", "solicitantes",
  "movimentacoes", "movimentacao_itens",
  "profiles", "user_roles", "user_modulos", "modulos",
] as const;

function DadosPage() {
  const [tabela, setTabela] = useState<typeof TABLES[number]>("itens");
  const { data, isLoading } = useQuery({
    queryKey: ["raw-table", tabela],
    queryFn: async () => {
      const { data, error } = await supabase.from(tabela as any).select("*").limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const cols = data?.[0] ? Object.keys(data[0]) : [];

  return (
    <>
      <Card className="p-4 mb-3 max-w-sm">
        <div className="text-xs uppercase text-muted-foreground mb-1">Tabela</div>
        <Select value={tabela} onValueChange={(v: any) => setTabela(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TABLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-sm">
          <span className="font-semibold">{tabela}</span>
          <span className="text-muted-foreground"> · {data?.length ?? 0} linhas (máx. 200)</span>
        </div>
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                {cols.map((c) => <th key={c} className="px-3 py-2 text-left font-medium whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={cols.length || 1} className="text-center py-8 text-muted-foreground">Carregando…</td></tr>
              ) : (data ?? []).map((row: any, i: number) => (
                <tr key={i} className="border-t border-border hover:bg-muted/30">
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-1.5 whitespace-nowrap font-mono">
                      {formatCell(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
              {!isLoading && !data?.length && (
                <tr><td colSpan={cols.length || 1} className="text-center py-8 text-muted-foreground">Sem dados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function formatCell(v: any) {
  if (v === null || v === undefined) return <span className="text-muted-foreground">—</span>;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}
