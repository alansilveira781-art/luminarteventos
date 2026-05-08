import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

export function MovimentacaoDetalhesDialog({
  open,
  onOpenChange,
  movimentacao,
  tipo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  movimentacao: any | null;
  tipo: "entrada" | "saida";
}) {
  if (!movimentacao) return null;
  const itens: any[] = movimentacao.movimentacao_itens ?? [];
  const total = itens.reduce(
    (acc, l) => acc + Number(l.quantidade ?? 0) * Number(l.valor_unitario ?? 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes do lançamento de {tipo === "entrada" ? "entrada" : "saída"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Info label="Data">
              {format(new Date(movimentacao.data_movimento), "dd/MM/yyyy HH:mm")}
            </Info>
            {tipo === "entrada" ? (
              <>
                <Info label="Fornecedor">{movimentacao.fornecedor?.nome ?? "—"}</Info>
                <Info label="Nota fiscal">{movimentacao.nota_fiscal ?? "—"}</Info>
              </>
            ) : (
              <>
                <Info label="Solicitante">{movimentacao.solicitante?.nome ?? "—"}</Info>
                <Info label="Evento/Projeto">{movimentacao.evento_projeto ?? "—"}</Info>
                <Info label="Devolver até">
                  {movimentacao.data_prevista_devolucao
                    ? format(new Date(movimentacao.data_prevista_devolucao), "dd/MM/yyyy")
                    : "—"}
                </Info>
              </>
            )}
            <Info label="Responsável">{movimentacao.responsavel_lancamento ?? "—"}</Info>
            {movimentacao.observacoes && (
              <div className="col-span-full">
                <Info label="Observações">{movimentacao.observacoes}</Info>
              </div>
            )}
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-left font-medium">Código</th>
                  <th className="px-3 py-2 text-right font-medium">Qtd</th>
                  <th className="px-3 py-2 text-left font-medium">UN</th>
                  {tipo === "entrada" && (
                    <>
                      <th className="px-3 py-2 text-right font-medium">Valor unit.</th>
                      <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {itens.map((l, idx) => (
                  <tr key={l.id ?? idx} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{l.item?.nome ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {l.item?.codigo ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{Number(l.quantidade)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.item?.unidade ?? "—"}</td>
                    {tipo === "entrada" && (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {l.valor_unitario != null ? `R$ ${Number(l.valor_unitario).toFixed(2)}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {l.valor_unitario != null
                            ? `R$ ${(Number(l.valor_unitario) * Number(l.quantidade)).toFixed(2)}`
                            : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              {tipo === "entrada" && total > 0 && (
                <tfoot className="bg-muted/30">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right font-medium">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      R$ {total.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
