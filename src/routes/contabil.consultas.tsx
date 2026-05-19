import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField, FormSection, FormActions } from "@/components/FormSection";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { EMPRESAS } from "@/lib/empresas";

const sb = supabase as any;

export const Route = createFileRoute("/contabil/consultas")({
  component: ConsultasImpostosPage,
});

type Consulta = {
  id: string;
  titulo: string;
  empresa: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  parametros: any;
  resultado: any;
  status: string;
  observacoes: string | null;
  created_at: string;
};

function ConsultasImpostosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Consulta | null>(null);

  const { data: consultas } = useQuery({
    queryKey: ["contabil-consultas"],
    queryFn: async () => {
      const { data, error } = await sb.from("contabil_consultas_impostos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Consulta[];
    },
  });

  const upsertMut = useMutation({
    mutationFn: async (p: any) => {
      if (p.id) { const { error } = await sb.from("contabil_consultas_impostos").update(p).eq("id", p.id); if (error) throw error; }
      else { const { error } = await sb.from("contabil_consultas_impostos").insert(p); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contabil-consultas"] }); toast.success("Consulta salva"); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await sb.from("contabil_consultas_impostos").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contabil-consultas"] }); toast.success("Excluída"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Consulta de impostos"
        description="Registre consultas e parâmetros para acompanhamento de coleta tributária"
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nova consulta</Button>}
      />
      <Card className="overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criada em</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(consultas ?? []).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma consulta registrada.</td></tr>
            ) : (consultas ?? []).map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3">{c.titulo}</td>
                <td className="px-4 py-3">{c.empresa ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{c.periodo_inicio ? format(new Date(c.periodo_inicio), "dd/MM/yyyy") : "—"} → {c.periodo_fim ? format(new Date(c.periodo_fim), "dd/MM/yyyy") : "—"}</td>
                <td className="px-4 py-3">{c.status}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) delMut.mutate(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar consulta" : "Nova consulta"}</DialogTitle></DialogHeader>
          <ConsultaForm initial={editing} onSubmit={(p) => upsertMut.mutate({ ...p, id: editing?.id })} submitting={upsertMut.isPending} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConsultaForm({ initial, onSubmit, submitting }: { initial: Consulta | null; onSubmit: (p: any) => void; submitting: boolean }) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [empresa, setEmpresa] = useState<string>(initial?.empresa ?? "__none");
  const [pi, setPi] = useState(initial?.periodo_inicio ?? "");
  const [pf, setPf] = useState(initial?.periodo_fim ?? "");
  const [parametros, setParametros] = useState<string>(initial ? JSON.stringify(initial.parametros ?? {}, null, 2) : "{}");
  const [resultado, setResultado] = useState<string>(initial ? JSON.stringify(initial.resultado ?? {}, null, 2) : "{}");
  const [status, setStatus] = useState(initial?.status ?? "pendente");
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (!titulo.trim()) return toast.error("Informe o título");
      let p: any = {}, r: any = {};
      try { p = JSON.parse(parametros || "{}"); } catch { return toast.error("Parâmetros: JSON inválido"); }
      try { r = JSON.parse(resultado || "{}"); } catch { return toast.error("Resultado: JSON inválido"); }
      onSubmit({
        titulo, empresa: empresa === "__none" ? null : empresa,
        periodo_inicio: pi || null, periodo_fim: pf || null,
        parametros: p, resultado: r, status, observacoes: observacoes || null,
      });
    }} className="space-y-4">
      <FormSection>
        <FormField label="Título*"><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required /></FormField>
        <FormField label="Empresa">
          <Select value={empresa} onValueChange={setEmpresa}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— Todas / não se aplica —</SelectItem>
              {EMPRESAS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Período início"><Input type="date" value={pi} onChange={(e) => setPi(e.target.value)} /></FormField>
        <FormField label="Período fim"><Input type="date" value={pf} onChange={(e) => setPf(e.target.value)} /></FormField>
        <FormField label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Parâmetros (JSON)" wide><Textarea rows={4} value={parametros} onChange={(e) => setParametros(e.target.value)} className="font-mono text-xs" /></FormField>
        <FormField label="Resultado (JSON)" wide><Textarea rows={4} value={resultado} onChange={(e) => setResultado(e.target.value)} className="font-mono text-xs" /></FormField>
        <FormField label="Observações" wide><Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></FormField>
      </FormSection>
      <FormActions><Button type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Salvar"}</Button></FormActions>
    </form>
  );
}
