import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { FormActions, FormField, FormSection } from "@/components/FormSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Upload, FileCode2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { entradaTipoLabels } from "@/lib/labels";
import { ImportDialog } from "@/components/ImportDialog";
import { ENTRADA_TEMPLATE } from "@/lib/import-utils";
import { parseNfeXml } from "@/lib/nfe-parser";

export const Route = createFileRoute("/entradas")({
  component: EntradasPage,
});

function EntradasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [importingXml, setImportingXml] = useState(false);

  const { data: entradas } = useQuery({
    queryKey: ["entradas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*, item:itens(nome,codigo,unidade), fornecedor:fornecedores(nome)")
        .eq("tipo", "entrada")
        .order("data_movimento", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: itens } = useQuery({
    queryKey: ["itens-select"],
    queryFn: async () => (await supabase.from("itens").select("id,nome,codigo,unidade").order("nome")).data ?? [],
  });
  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores-select"],
    queryFn: async () => (await supabase.from("fornecedores").select("id,nome").eq("status", "ativo").order("nome")).data ?? [],
  });

  const mut = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase.from("movimentacoes").insert({ ...p, tipo: "entrada" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entradas"] });
      qc.invalidateQueries({ queryKey: ["itens"] });
      qc.invalidateQueries({ queryKey: ["dashboard-itens"] });
      toast.success("Entrada registrada");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Entradas"
        description="Registro de itens recebidos no estoque"
        actions={
          <>
            <Button type="button" size="lg" variant="outline" onClick={() => setImportingXml(true)}>
              <FileCode2 className="h-4 w-4 mr-1" /> Importar NF-e (XML)
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={() => setImportingExcel(true)}>
              <Upload className="h-4 w-4 mr-1" /> Importar Excel
            </Button>
            <Button type="button" size="lg" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />Nova entrada
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium text-right">Qtd</th>
                <th className="px-4 py-3 font-medium text-right">Valor total</th>
                <th className="px-4 py-3 font-medium">NF</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {entradas?.length ? entradas.map((m: any) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">{format(new Date(m.data_movimento), "dd/MM/yyyy HH:mm")}</td>
                  <td className="px-4 py-3 font-medium">{m.item?.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.entrada_tipo ? entradaTipoLabels[m.entrada_tipo] : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.fornecedor?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-success">+{Number(m.quantidade)} {m.item?.unidade}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {m.valor_unitario ? `R$ ${(Number(m.valor_unitario) * Number(m.quantidade)).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{m.nota_fiscal ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.responsavel_lancamento ?? "—"}</td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Nenhuma entrada registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Nova entrada</DialogTitle></DialogHeader>
          <EntradaForm itens={itens ?? []} fornecedores={fornecedores ?? []} onSubmit={(p: any) => mut.mutate(p)} submitting={mut.isPending} />
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importingExcel}
        onOpenChange={setImportingExcel}
        title="Importar entradas via Excel"
        description="Envie uma planilha com as entradas. O item é localizado pelo campo 'codigo_item' e o fornecedor pelo nome (criado se não existir)."
        templateFilename="modelo_entradas.xlsx"
        templateHeaders={ENTRADA_TEMPLATE.headers}
        templateExample={ENTRADA_TEMPLATE.example}
        onImport={async (rows) => {
          const errors: string[] = []; let inserted = 0, skipped = 0;
          const { data: itensAll } = await supabase.from("itens").select("id,codigo");
          const itensMap = new Map((itensAll ?? []).map((i: any) => [String(i.codigo).toLowerCase(), i.id]));
          const { data: fornAll } = await supabase.from("fornecedores").select("id,nome");
          const fornMap = new Map((fornAll ?? []).map((f: any) => [String(f.nome).toLowerCase(), f.id]));

          for (const [idx, r] of rows.entries()) {
            const cod = String(r.codigo_item ?? "").trim().toLowerCase();
            const item_id = itensMap.get(cod);
            if (!item_id) { skipped++; errors.push(`Linha ${idx + 2}: item '${r.codigo_item}' não encontrado`); continue; }
            const qtd = Number(r.quantidade || 0);
            if (qtd <= 0) { skipped++; errors.push(`Linha ${idx + 2}: quantidade inválida`); continue; }
            let fornecedor_id: string | null = null;
            const fornNome = String(r.fornecedor_nome ?? "").trim();
            if (fornNome) {
              fornecedor_id = fornMap.get(fornNome.toLowerCase()) ?? null;
              if (!fornecedor_id) {
                const { data: novo } = await supabase.from("fornecedores").insert({ nome: fornNome }).select("id").single();
                if (novo) { fornecedor_id = novo.id; fornMap.set(fornNome.toLowerCase(), novo.id); }
              }
            }
            const data_movimento = r.data_movimento ? new Date(r.data_movimento).toISOString() : new Date().toISOString();
            const { error } = await supabase.from("movimentacoes").insert({
              tipo: "entrada", entrada_tipo: "compra", item_id, fornecedor_id,
              quantidade: qtd, valor_unitario: r.valor_unitario ? Number(r.valor_unitario) : null,
              nota_fiscal: r.nota_fiscal || null, data_movimento,
              responsavel_lancamento: r.responsavel_lancamento || null, observacoes: r.observacoes || null,
            });
            if (error) { skipped++; errors.push(`Linha ${idx + 2}: ${error.message}`); }
            else inserted++;
          }
          qc.invalidateQueries({ queryKey: ["entradas"] });
          qc.invalidateQueries({ queryKey: ["itens"] });
          return { inserted, skipped, errors };
        }}
      />

      <NfeImportDialog open={importingXml} onOpenChange={setImportingXml} onDone={() => {
        qc.invalidateQueries({ queryKey: ["entradas"] });
        qc.invalidateQueries({ queryKey: ["itens"] });
        qc.invalidateQueries({ queryKey: ["fornecedores"] });
      }} />
    </>
  );
}

function NfeImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const loadPreview = async (f: File) => {
    try { setPreview(await parseNfeXml(f)); }
    catch (e: any) { toast.error(e.message); setPreview(null); }
  };

  const handleImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      // 1) Garantir fornecedor
      let fornecedor_id: string | null = null;
      const nome = preview.fornecedor.nome;
      const { data: existente } = await supabase.from("fornecedores").select("id").ilike("nome", nome).maybeSingle();
      if (existente) fornecedor_id = existente.id;
      else {
        const { data: novo, error } = await supabase.from("fornecedores").insert({
          nome, documento: preview.fornecedor.cnpj ?? null,
        }).select("id").single();
        if (error) throw error;
        fornecedor_id = novo.id;
      }

      let inserted = 0;
      for (const it of preview.itens) {
        // Criar/obter item por código
        let item_id: string | null = null;
        const { data: existenteItem } = await supabase.from("itens").select("id").eq("codigo", it.codigo).maybeSingle();
        if (existenteItem) item_id = existenteItem.id;
        else {
          const { data: novoItem, error: errIt } = await supabase.from("itens").insert({
            codigo: it.codigo, nome: it.nome, unidade: it.unidade || "un",
          }).select("id").single();
          if (errIt) { toast.error(`Item ${it.codigo}: ${errIt.message}`); continue; }
          item_id = novoItem.id;
        }
        const { error: errMov } = await supabase.from("movimentacoes").insert({
          tipo: "entrada", entrada_tipo: "compra", item_id, fornecedor_id,
          quantidade: it.quantidade, valor_unitario: it.valor_unitario,
          nota_fiscal: preview.numero ?? null,
          data_movimento: preview.emissao ? new Date(preview.emissao).toISOString() : new Date().toISOString(),
        });
        if (!errMov) inserted++;
      }
      toast.success(`${inserted} item(ns) importado(s) da NF-e`);
      onDone();
      onOpenChange(false);
      setFile(null); setPreview(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setFile(null); setPreview(null); } }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Importar NF-e (XML)</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Card className="p-4 bg-muted/30 text-sm">
            <div className="font-medium mb-1">Formato esperado</div>
            <div className="text-muted-foreground text-xs">
              XML padrão SEFAZ (NF-e), normalmente disponibilizado pelo fornecedor após a emissão. Contém os dados do emitente, itens, quantidades e valores.
              O sistema vai criar fornecedor e itens automaticamente caso ainda não existam.
            </div>
          </Card>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Arquivo XML</label>
            <Input type="file" accept=".xml" onChange={async (e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f); setPreview(null);
              if (f) await loadPreview(f);
            }} />
          </div>

          {preview && (
            <Card className="p-3 text-sm space-y-2">
              <div><span className="text-muted-foreground">Fornecedor:</span> <strong>{preview.fornecedor.nome}</strong> {preview.fornecedor.cnpj ? `(${preview.fornecedor.cnpj})` : ""}</div>
              <div><span className="text-muted-foreground">NF nº:</span> {preview.numero ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{preview.itens.length} item(ns)</div>
              <div className="max-h-48 overflow-auto text-xs border-t border-border pt-2">
                {preview.itens.map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between gap-2 py-0.5 border-b border-border/50 last:border-0">
                    <span className="font-mono text-muted-foreground">{i.codigo}</span>
                    <span className="flex-1 truncate">{i.nome}</span>
                    <span className="tabular-nums">{i.quantidade} {i.unidade}</span>
                    <span className="tabular-nums text-muted-foreground">R$ {i.valor_unitario.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={handleImport} disabled={!preview || busy}>
              {busy ? "Importando…" : "Importar entrada"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EntradaForm({ itens, fornecedores, onSubmit, submitting }: any) {
  const [f, setF] = useState({
    data_movimento: new Date().toISOString().slice(0, 16),
    entrada_tipo: "compra",
    item_id: "",
    fornecedor_id: "",
    quantidade: 1,
    valor_unitario: "",
    nota_fiscal: "",
    responsavel_lancamento: "",
    observacoes: "",
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const total = f.valor_unitario && f.quantidade ? (Number(f.valor_unitario) * Number(f.quantidade)).toFixed(2) : null;

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (!f.item_id) return toast.error("Selecione um item");
      onSubmit({
        ...f,
        data_movimento: new Date(f.data_movimento).toISOString(),
        quantidade: Number(f.quantidade),
        valor_unitario: f.valor_unitario ? Number(f.valor_unitario) : null,
        fornecedor_id: f.fornecedor_id || null,
      });
    }} className="space-y-4">
      <FormSection>
        <FormField label="Data*"><Input required type="datetime-local" value={f.data_movimento} onChange={(e) => set("data_movimento", e.target.value)} /></FormField>
        <FormField label="Tipo de entrada*">
          <Select value={f.entrada_tipo} onValueChange={(v) => set("entrada_tipo", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(entradaTipoLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Item*">
          <Select value={f.item_id} onValueChange={(v) => set("item_id", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>{itens.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.codigo} — {i.nome}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Fornecedor">
          <Select value={f.fornecedor_id} onValueChange={(v) => set("fornecedor_id", v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{fornecedores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="Quantidade*"><Input required type="number" min="0.01" step="0.01" value={f.quantidade} onChange={(e) => set("quantidade", e.target.value)} /></FormField>
        <FormField label="Valor unitário (R$)"><Input type="number" min="0" step="0.01" value={f.valor_unitario} onChange={(e) => set("valor_unitario", e.target.value)} /></FormField>
        {total && <div className="md:col-span-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Valor total: <span className="text-foreground font-medium">R$ {total}</span></div>}
        <FormField label="Nota fiscal / documento"><Input value={f.nota_fiscal} onChange={(e) => set("nota_fiscal", e.target.value)} /></FormField>
        <FormField label="Responsável pelo lançamento"><Input value={f.responsavel_lancamento} onChange={(e) => set("responsavel_lancamento", e.target.value)} /></FormField>
        <FormField label="Observações" wide><Textarea rows={2} value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></FormField>
        <FormActions><Button type="submit" size="lg" disabled={submitting}>{submitting ? "Registrando…" : "Registrar entrada"}</Button></FormActions>
      </FormSection>
    </form>
  );
}
