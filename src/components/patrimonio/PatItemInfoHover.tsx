import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { supabase } from "@/integrations/supabase/client";

/**
 * Olhinho com hover para visualizar dados completos de um item do patrimônio,
 * incluindo a quantidade cadastrada.
 */
export function PatItemInfoHover({ itemId }: { itemId?: string | null }) {
  const enabled = !!itemId;
  const { data: item } = useQuery({
    queryKey: ["pat-item-info", itemId],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("pat_itens")
        .select("*")
        .eq("id", itemId!)
        .maybeSingle();
      return data;
    },
  });

  if (!enabled) return null;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <span
          role="button"
          tabIndex={-1}
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-help"
          aria-label="Ver detalhes do item"
          onClick={(e) => e.preventDefault()}
        >
          <Eye className="h-3.5 w-3.5" />
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        avoidCollisions
        className="w-80 max-h-[70vh] overflow-y-auto text-xs z-[60]"
      >
        {!item ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-2">
            <div>
              <div className="font-semibold text-sm leading-tight">{item.nome}</div>
              <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                {item.id_item ?? "—"}
                {item.cod != null ? ` · COD: ${item.cod}` : ""}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <Info label="Categoria" value={item.categoria} />
              <Info label="Subcategoria" value={item.subcategoria} />
              <Info label="Unidade" value={item.unidade} />
              <Info label="Estado" value={item.estado} />
              <Info label="Quantidade" value={item.quantidade} />
              <Info label="Localização" value={item.localizacao} />
              <Info label="Dimensões" value={item.dimensoes} />
              <Info
                label="Valor"
                value={
                  item.valor != null
                    ? Number(item.valor).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : null
                }
              />
              <Info
                label="Data compra"
                value={item.data_compra ? new Date(item.data_compra + "T00:00").toLocaleDateString("pt-BR") : null}
              />
            </div>
            {item.especificacao && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Especificação</div>
                <div className="text-foreground/90">{item.especificacao}</div>
              </div>
            )}
            {item.observacoes && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Observações</div>
                <div className="text-foreground/90">{item.observacoes}</div>
              </div>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-foreground/90 truncate">{String(value)}</div>
    </div>
  );
}
