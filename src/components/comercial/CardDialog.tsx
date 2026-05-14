import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CARD_STATUSES, type CardStatus, type ComercialCard } from "@/lib/comercial/types";
import { createCard, updateCard, deleteCard, upsertCliente } from "@/lib/comercial/store";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card?: ComercialCard | null;
  defaultStatus?: CardStatus;
};

const empty = {
  clienteNome: "",
  clienteTelefone: "",
  clienteEmail: "",
  eventoNome: "",
  eventoData: "",
  valorEstimado: 0,
  responsavel: "",
  observacoes: "",
  status: "lead" as CardStatus,
};

export function CardDialog({ open, onOpenChange, card, defaultStatus }: Props) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) {
      if (card) {
        setForm({
          clienteNome: card.clienteNome,
          clienteTelefone: "",
          clienteEmail: "",
          eventoNome: card.eventoNome,
          eventoData: card.eventoData,
          valorEstimado: card.valorEstimado,
          responsavel: card.responsavel,
          observacoes: card.observacoes,
          status: card.status,
        });
      } else {
        setForm({ ...empty, status: defaultStatus ?? "lead" });
      }
    }
  }, [open, card, defaultStatus]);

  function save() {
    if (!form.clienteNome.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (card) {
      updateCard(card.id, {
        clienteNome: form.clienteNome,
        eventoNome: form.eventoNome,
        eventoData: form.eventoData,
        valorEstimado: Number(form.valorEstimado) || 0,
        responsavel: form.responsavel,
        observacoes: form.observacoes,
        status: form.status,
      });
      toast.success("Card atualizado");
    } else {
      let clienteId: string | null = null;
      if (form.clienteNome.trim()) {
        const c = upsertCliente({
          nome: form.clienteNome.trim(),
          telefone: form.clienteTelefone.trim(),
          email: form.clienteEmail.trim(),
        });
        clienteId = c.id;
      }
      createCard({
        clienteId,
        clienteNome: form.clienteNome,
        eventoNome: form.eventoNome,
        eventoData: form.eventoData,
        valorEstimado: Number(form.valorEstimado) || 0,
        responsavel: form.responsavel,
        observacoes: form.observacoes,
        status: form.status,
      });
      toast.success("Lead criado");
    }
    onOpenChange(false);
  }

  function handleDelete() {
    if (!card) return;
    if (!confirm("Excluir este card?")) return;
    deleteCard(card.id);
    toast.success("Card excluído");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{card ? "Editar card" : "Novo lead"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome do cliente *</Label>
            <Input value={form.clienteNome} onChange={(e) => setForm({ ...form, clienteNome: e.target.value })} />
          </div>
          {!card && (
            <>
              <div>
                <Label>Telefone do cliente</Label>
                <Input value={form.clienteTelefone} onChange={(e) => setForm({ ...form, clienteTelefone: e.target.value })} />
              </div>
              <div>
                <Label>Email do cliente</Label>
                <Input value={form.clienteEmail} onChange={(e) => setForm({ ...form, clienteEmail: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <Label>Nome do evento</Label>
            <Input value={form.eventoNome} onChange={(e) => setForm({ ...form, eventoNome: e.target.value })} />
          </div>
          <div>
            <Label>Data do evento</Label>
            <Input type="date" value={form.eventoData} onChange={(e) => setForm({ ...form, eventoData: e.target.value })} />
          </div>
          <div>
            <Label>Valor estimado (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.valorEstimado}
              onChange={(e) => setForm({ ...form, valorEstimado: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CardStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CARD_STATUSES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Observações rápidas</Label>
            <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {card && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
