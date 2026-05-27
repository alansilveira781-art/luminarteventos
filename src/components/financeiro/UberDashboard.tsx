import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { getUberTrips, type UberTrip } from "@/lib/uber.functions";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#84cc16"];
const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtN = (n: number) => n.toLocaleString("pt-BR");

function addMonths(iso: string, months: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
function diffDays(from: string, to: string) {
  return Math.max(1, Math.round((+new Date(to) - +new Date(from)) / 86400000));
}
function shiftDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function sum(arr: UberTrip[]) {
  return arr.reduce((s, t) => s + (t.fare ?? 0), 0);
}

export function UberDashboard({ from, to }: { from: string; to: string }) {
  const fetchTrips = useServerFn(getUberTrips);
  const { data, isLoading, error } = useQuery({
    queryKey: ["uber-trips", from, to],
    queryFn: () => fetchTrips({ data: { from, to } }),
    staleTime: 0,
  });

  const trips = data?.trips ?? [];
  const apiError = data?.error;

  const kpis = useMemo(() => {
    const total = sum(trips);
    const count = trips.length;
    const ticket = count ? total / count : 0;

    const days = diffDays(from, to);
    const prevFrom = shiftDays(from, -days);
    const prevTo = shiftDays(from, -1);
    return { total, count, ticket, prevFrom, prevTo };
  }, [trips, from, to]);

  const porMes = useMemo(() => {
    const map = new Map<string, number>();
    trips.forEach((t) => {
      const k = t.request_time.slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + (t.fare ?? 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valor]) => ({ mes, valor: Math.round(valor * 100) / 100 }));
  }, [trips]);

  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    trips.forEach((t) => {
      const k = t.product_type || "—";
      map.set(k, (map.get(k) ?? 0) + (t.fare ?? 0));
    });
    return Array.from(map.entries()).map(([nome, valor]) => ({
      nome,
      valor: Math.round(valor * 100) / 100,
    }));
  }, [trips]);

  const porProjeto = useMemo(() => {
    const map = new Map<string, number>();
    trips.forEach((t) => {
      const k = (t.expense_code || t.expense_memo || "Sem projeto").trim();
      map.set(k, (map.get(k) ?? 0) + (t.fare ?? 0));
    });
    return Array.from(map.entries())
      .map(([nome, valor]) => ({ nome, valor: Math.round(valor * 100) / 100 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [trips]);

  const topSolicitantes = useMemo(() => {
    const map = new Map<string, { nome: string; viagens: number; total: number }>();
    trips.forEach((t) => {
      const nome = t.employee?.name || t.employee?.email || "—";
      const cur = map.get(nome) ?? { nome, viagens: 0, total: 0 };
      cur.viagens += 1;
      cur.total += t.fare ?? 0;
      map.set(nome, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [trips]);

  const enderecos = useMemo(() => {
    const map = new Map<string, number>();
    trips.forEach((t) => {
      [t.start_address, t.end_address].forEach((a) => {
        if (!a) return;
        const k = a.trim().toLowerCase();
        map.set(k, (map.get(k) ?? 0) + 1);
      });
    });
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
    return Array.from(map.entries())
      .map(([endereco, count]) => ({ endereco, count, pct: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [trips]);

  // Comparações
  const comparacoes = useMemo(() => {
    const now = new Date();
    const ymCur = now.toISOString().slice(0, 7);
    const ymPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const yCur = String(now.getFullYear());
    const yPrev = String(now.getFullYear() - 1);

    const sumBy = (pred: (t: UberTrip) => boolean) =>
      trips.filter(pred).reduce((s, t) => s + (t.fare ?? 0), 0);

    const mesAtual = sumBy((t) => t.request_time.startsWith(ymCur));
    const mesAnterior = sumBy((t) => t.request_time.startsWith(ymPrev));
    const anoAtual = sumBy((t) => t.request_time.startsWith(yCur));
    const anoAnterior = sumBy((t) => t.request_time.startsWith(yPrev));

    const fromMs = +new Date(from);
    const toMs = +new Date(to);
    const dur = toMs - fromMs;
    const prevStart = fromMs - dur;
    const periodo = sumBy((t) => {
      const ts = +new Date(t.request_time);
      return ts >= fromMs && ts <= toMs;
    });
    const periodoAnterior = sumBy((t) => {
      const ts = +new Date(t.request_time);
      return ts >= prevStart && ts < fromMs;
    });

    return { mesAtual, mesAnterior, anoAtual, anoAnterior, periodo, periodoAnterior };
  }, [trips, from, to]);

  if (isLoading) {
    return (
      <Card className="p-12 text-center text-sm text-muted-foreground">
        Carregando dados do Uber Business...
      </Card>
    );
  }

  if (apiError) {
    return (
      <Card className="p-8">
        <div className="text-sm font-semibold mb-2 text-destructive">Erro ao buscar dados Uber</div>
        <p className="text-sm text-muted-foreground">{apiError}</p>
      </Card>
    );
  }

  if (!trips.length) {
    return (
      <Card className="p-12 text-center">
        <div className="text-sm font-semibold mb-1">Sem corridas no período</div>
        <p className="text-sm text-muted-foreground">
          Ajuste o filtro de datas ou verifique se há viagens em sua organização Uber Business.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gasto total" value={fmt(kpis.total)} />
        <Stat label="Nº de corridas" value={fmtN(kpis.count)} />
        <Stat label="Ticket médio" value={fmt(kpis.ticket)} />
        <Stat label="Solicitantes únicos" value={fmtN(topSolicitantes.length)} />
      </div>

      {/* Comparações */}
      <div className="grid gap-3 sm:grid-cols-3">
        <CompareCard label="Mês atual vs anterior" cur={comparacoes.mesAtual} prev={comparacoes.mesAnterior} />
        <CompareCard label="Ano atual vs anterior" cur={comparacoes.anoAtual} prev={comparacoes.anoAnterior} />
        <CompareCard label="Período vs anterior" cur={comparacoes.periodo} prev={comparacoes.periodoAnterior} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Gasto mensal (R$)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="mes" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Bar dataKey="valor" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gasto por tipo de corrida">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={porTipo} dataKey="valor" nameKey="nome" outerRadius={90} label>
                {porTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gasto por projeto / centro de custo (R$)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={Math.max(260, porProjeto.length * 30)}>
            <BarChart data={porProjeto} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="nome" width={160} fontSize={11} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Bar dataKey="valor" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">Top solicitantes</div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-2">Nome</th>
                  <th className="text-right py-2">Viagens</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {topSolicitantes.map((s) => (
                  <tr key={s.nome} className="border-b last:border-0">
                    <td className="py-2">{s.nome}</td>
                    <td className="text-right">{s.viagens}</td>
                    <td className="text-right">{fmt(s.total)}</td>
                    <td className="text-right">{fmt(s.total / s.viagens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">Endereços recorrentes</div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-2">Endereço</th>
                  <th className="text-right py-2">Vezes</th>
                  <th className="text-right py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {enderecos.map((e) => (
                  <tr key={e.endereco} className="border-b last:border-0">
                    <td className="py-2 max-w-md truncate" title={e.endereco}>{e.endereco}</td>
                    <td className="text-right">{e.count}</td>
                    <td className="text-right">{e.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

function CompareCard({ label, cur, prev }: { label: string; cur: number; prev: number }) {
  const delta = prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;
  const up = delta >= 0;
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{fmt(cur)}</div>
      <div className="text-xs text-muted-foreground mt-1">
        Anterior: {fmt(prev)} •{" "}
        <span className={up ? "text-emerald-600" : "text-red-600"}>
          {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
        </span>
      </div>
    </Card>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="text-sm font-semibold mb-3">{title}</div>
      {children}
    </Card>
  );
}
