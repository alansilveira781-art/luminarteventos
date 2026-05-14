import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (motivo: string) => void;
};

export function PerdaDialog({ open, onOpenChange, onConfirm }: Props) {
  const [motivo, setMotivo] = useState("");
  useEffect(() => { if (open) setMotivo(""); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como perda</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Motivo da perda *</Label>
          <Textarea
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo da perda…"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={!motivo.trim()}
            onClick={() => { onConfirm(motivo.trim()); onOpenChange(false); }}
          >
            Confirmar perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
