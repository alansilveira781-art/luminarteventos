import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormSection } from "@/components/FormSection";
import { ArrowDownToLine, ArrowUpFromLine, Undo2, DollarSign, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export const Route = createFileRoute("/relatorios")({
  component: RelatoriosPage,
});

const ALL = "__all__";

function RelatoriosPage() {
  const hoje = new Date();
  const inicioPadrao = startOfMonth(subMonths(hoje, 5));
  const fimPadrao = endOfMonth(hoje);

  const [dataIni, setDataIni] = useState(format(inicioPadrao, "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(fimPadrao, "yyyy-MM-dd"));
  const [categoria, setCategoria] = useState(ALL);
  const [solicitanteId, setSolicitanteId] = useState(ALL);
  const [fornecedorId, setFornecedorId] = useState(ALL);

  const { data: itens } = useQuery({
    queryKey: ["rel-itens"],
    queryFn: async () => (await supabase.from("itens").select("id,categoria")).data ?? [],
  });
  const { data: solicitantes } = useQuery({
    queryKey: ["rel-solicitantes"],
    queryFn: async () => (await supabase.from("solicitantes").select("id,nome").order("nome")).data ?? [],
  });
  const { data: fornecedores } = useQuery({
    queryKey: ["rel-fornecedores"],
    queryFn: async () => (await supabase.from("fornecedores").select("id,nome").order("nome")).data ?? [],
  });

  const categorias = useMemo(() => {
    const set = new Set<string>();
    (itens ?? []).forEach((i: any) => { if (i.categoria) set.add(i.categoria); });
    return Array.from(set).sort();
  }, [itens]);

  const itemCategoriaMap = useMemo(() => {
    const m = new Map<string, string | null>();
    (itens ?? []).forEach((i: any) => m.set(i.id, i.categoria ?? null));
    return m;
  }, [itens]);

  const { data: movs, isLoading } = useQuery({
    queryKey: ["rel-mov", dataIni, dataFim, categoria, solicitanteId, fornecedorId],
    queryFn: async () => {
      let q = supabase
        .from("movimentacoes")
        .select("id,tipo,quantidade,valor_unitario,data_movimento,item_id,solicitante_id,fornecedor_id,evento_projeto, item:itens(nome,codigo,categoria)")
        .gte("data_movimento", new Date(dataIni).toISOString())
        .lte("data_movimento", new Date(`${dataFim}T23:59:59`).toISOString())
        .order("data_movimento", { ascending: false })
        .limit(5000);
      if (solicitanteId !== ALL) q = q.eq("solicitante_id", solicitanteId);
      if (fornecedorId !== ALL) q = q.eq("fornecedor_id", fornecedorId);
      const { data, error } = await q;
      if (error) throw error;
      let rows = data ?? [];
      if (categoria !== ALL) rows = rows.filter((m: any) => itemCategoriaMap.get(m.item_id) === categoria);
      return rows;
    },
  });

  const stats = useMemo(() => {
    const list = movs ?? [];
    const entradas = list.filter((m: any) => m.tipo === "entrada");
    const saidas = list.filter((m: any) => m.tipo === "saida");
    const devolucoes = list.filter((m: any) => m.tipo === "devolucao");
    const gastoTotal = entradas.reduce((acc: number, m: any) => acc + (Number(m.valor_unitario || 0) * Number(m.quantidade || 0)), 0);
    return {
      gastoTotal,
      qtdEntradas: entradas.reduce((a: number, m: any) => a + Number(m.quantidade || 0), 0),
      qtdSaidas: saidas.reduce((a: number, m: any) => a + Number(m.quantidade || 0), 0),
      qtdDevolucoes: devolucoes.reduce((a: number, m: any) => a + Number(m.quantidade || 0), 0),
      registros: list.length,
    };
  }, [movs]);

  const porMes = useMemo(() => {
    const m = new Map<string, { gasto: number; entradas: number; saidas: number; devolucoes: number }>();
    for (const mov of movs ?? []) {
      const key = format(new Date(mov.data_movimento), "yyyy-MM");
      const cur = m.get(key) ?? { gasto: 0, entradas: 0, saidas: 0, devolucoes: 0 };
      const qtd = Number(mov.quantidade || 0);
      if (mov.tipo === "entrada") {
        cur.gasto += Number(mov.valor_unitario || 0) * qtd;
        cur.entradas += qtd;
      } else if (mov.tipo === "saida") cur.saidas += qtd;
      else if (mov.tipo === "devolucao") cur.devolucoes += qtd;
      m.set(key, cur);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [movs]);

  const porCategoria = useMemo(() => {
    const m = new Map<string, { gasto: number; entradas: number; saidas: number }>();
    for (const mov of movs ?? []) {
      const cat = (mov as any).item?.categoria ?? "Sem categoria";
      const cur = m.get(cat) ?? { gasto: 0, entradas: 0, saidas: 0 };
      const qtd = Number(mov.quantidade || 0);
      if (mov.tipo === "entrada") {
        cur.gasto += Number(mov.valor_unitario || 0) * qtd;
        cur.entradas += qtd;
      } else if (mov.tipo === "saida") cur.saidas += qtd;
      m.set(cat, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].gasto - a[1].gasto);
  }, [movs]);

  const exportCsv = () => {
    const linhas = [
      ["Mês", "Gasto (R$)", "Entradas", "Saídas", "Devoluções"],
      ...porMes.map(([mes, v]) => [mes, v.gasto.toFixed(2), v.entradas, v.saidas, v.devolucoes]),
      [],
      ["Categoria", "Gasto (R$)", "Entradas", "Saídas"],
      ...porCategoria.map(([cat, v]) => [cat, v.gasto.toFixed(2), v.entradas, v.saidas]),
    ];
    const csv = linhas.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio_${dataIni}_a_${dataFim}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const maxGastoMes = Math.max(1, ...porMes.map(([, v]) => v.gasto));
  const maxGastoCat = Math.max(1, ...porCategoria.map(([, v]) => v.gasto));

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Análise de gastos, entradas, saídas e devoluções"
        actions={
          <Button type="button" size="lg" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        }
      />

      <Card className="p-4 mb-4">
        <FormSection>
          <FormField label="Data inicial"><Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} /></FormField>
          <FormField label="Data final"><Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></FormField>
          <FormField label="Categoria">
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Solicitante">
            <Select value={solicitanteId} onValueChange={setSolicitanteId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {(solicitantes ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Fornecedor" wide>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {(fornecedores ?? []).map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Gasto total (compras)" value={`R$ ${stats.gastoTotal.toFixed(2)}`} icon={<DollarSign className="h-4 w-4" />} accent="text-primary" />
        <KpiCard label="Entradas" value={stats.qtdEntradas.toString()} icon={<ArrowDownToLine className="h-4 w-4" />} accent="text-success" />
        <KpiCard label="Saídas" value={stats.qtdSaidas.toString()} icon={<ArrowUpFromLine className="h-4 w-4" />} accent="text-destructive" />
        <KpiCard label="Devoluções" value={stats.qtdDevolucoes.toString()} icon={<Undo2 className="h-4 w-4" />} accent="text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Gastos por mês</h2>
          {isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> : porMes.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem dados no período.</div>
          ) : (
            <div className="space-y-2">
              {porMes.map(([mes, v]) => (
                <div key={mes} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{mes}</span>
                    <span className="tabular-nums font-medium">R$ {v.gasto.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(v.gasto / maxGastoMes) * 100}%` }} />
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>↓ {v.entradas} entr.</span>
                    <span>↑ {v.saidas} saídas</span>
                    <span>↺ {v.devolucoes} dev.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Gastos por categoria</h2>
          {isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> : porCategoria.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem dados no período.</div>
          ) : (
            <div className="space-y-2">
              {porCategoria.map(([cat, v]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate pr-2">{cat}</span>
                    <span className="tabular-nums font-medium">R$ {v.gasto.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accent to-primary" style={{ width: `${(v.gasto / maxGastoCat) * 100}%` }} />
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>↓ {v.entradas} entr.</span>
                    <span>↑ {v.saidas} saídas</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <h2 className="text-sm font-semibold mb-3">Resumo geral</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Período</div>
            <div className="font-medium">{format(new Date(dataIni), "dd/MM/yyyy")} → {format(new Date(dataFim), "dd/MM/yyyy")}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Registros analisados</div>
            <div className="font-medium tabular-nums">{stats.registros}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Ticket médio (entradas)</div>
            <div className="font-medium tabular-nums">R$ {stats.qtdEntradas > 0 ? (stats.gastoTotal / stats.qtdEntradas).toFixed(2) : "0.00"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Saldo de movimentação</div>
            <div className="font-medium tabular-nums">{stats.qtdEntradas - stats.qtdSaidas + stats.qtdDevolucoes}</div>
          </div>
        </div>
      </Card>
    </>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <Card className="p-4">
      <div className={`flex items-center gap-2 text-xs uppercase tracking-wider ${accent}`}>
        {icon}<span>{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
