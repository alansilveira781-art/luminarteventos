import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField, FormSection } from "@/components/FormSection";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/modulos")({
  component: ModulosPage,
});

function ModulosPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["modulos"],
    queryFn: async () => (await supabase.from("modulos").select("*").order("ordem")).data ?? [],
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modulos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Módulo removido");
      qc.invalidateQueries({ queryKey: ["modulos"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo módulo
        </Button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Rota</th>
                <th className="px-4 py-3 text-left">Ativo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((m: any) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-2.5">{m.nome}</td>
                  <td className="px-4 py-2.5"><code className="text-xs">{m.slug}</code></td>
                  <td className="px-4 py-2.5">{m.rota ?? "—"}</td>
                  <td className="px-4 py-2.5">{m.ativo ? "Sim" : "Não"}</td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm(`Remover "${m.nome}"?`) && remove.mutate(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!data?.length && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum módulo</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {open && <ModuloDialog initial={editing} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["modulos"] }); }} />}
    </>
  );
}

function ModuloDialog({ initial, onClose }: { initial: any; onClose: () => void }) {
  const [form, setForm] = useState({
    slug: initial?.slug ?? "",
    nome: initial?.nome ?? "",
    descricao: initial?.descricao ?? "",
    rota: initial?.rota ?? "",
    icone: initial?.icone ?? "",
    ordem: initial?.ordem ?? 0,
    ativo: initial?.ativo ?? true,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, ordem: Number(form.ordem) };
      if (initial?.id) {
        const { error } = await supabase.from("modulos").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("modulos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Editar módulo" : "Novo módulo"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          className="space-y-3"
        >
          <FormSection>
            <FormField label="Nome*"><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></FormField>
            <FormField label="Slug* (identificador)"><Input required pattern="[a-z0-9_-]+" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></FormField>
            <FormField label="Rota inicial"><Input value={form.rota} onChange={(e) => setForm({ ...form, rota: e.target.value })} placeholder="/" /></FormField>
            <FormField label="Ordem"><Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} /></FormField>
            <FormField label="Descrição" wide><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></FormField>
            <FormField label="Ativo">
              <div className="flex items-center gap-2 h-9">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <span className="text-xs text-muted-foreground">{form.ativo ? "Visível" : "Oculto"}</span>
              </div>
            </FormField>
          </FormSection>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
