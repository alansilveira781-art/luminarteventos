## Mudanças no módulo de Compras

### 1. ID da compra acima do botão de fechar (`src/components/CompraDialog.tsx`)
Hoje o `COMPRA-XX` aparece na mesma linha do título, ao lado do "X" de fechar. Vou movê-lo para uma faixa própria no topo do `DialogContent`, acima do header, de forma que o número fique posicionado **acima** do botão de fechar (que continua no canto superior direito).

- Renderizar um pequeno bloco no topo: `COMPRA-XX` em fonte mono, com fundo sutil (`bg-muted/50`), alinhado à esquerda, antes do `<DialogHeader>`.
- Remover o `<span>` do `COMPRA-XX` que está dentro do `DialogTitle`.
- Quando for "Nova compra" (sem número ainda), o bloco não aparece.

### 2. Campo Evento/Projeto por item

**Banco** (`compra_itens`):
- Migration adicionando coluna `evento_projeto text NULL`.

**Lista de opções** — reaproveitar `listEventos` (`src/server/sheets.functions.ts`) que já lê a coluna A da planilha do Google Sheets, e concatenar localmente as 4 opções fixas que o usuário pediu:
- Manutenção do Galpão
- Reposição de Estoque
- Showroom
- Placas do Zé

Estas 4 são adicionadas no front (deduplicadas e ordenadas) para não depender da planilha.

**UI** (`src/components/CompraDialog.tsx`, aba "Itens"):
- `useQuery(["sheets-eventos"], listEventos)` no topo do componente (mesmo padrão de `saidas.tsx`).
- Lista final = `Array.from(new Set([...sheetsEventos, "Manutenção do Galpão", "Reposição de Estoque", "Showroom", "Placas do Zé"])).sort()`.
- Em cada card de item, adicionar um campo **Evento/Projeto** (Select com busca via `Combobox`/`SelectCreatable` simples — usar `Select` nativo já que o número de opções é gerenciável; permitir digitar via `SelectCreatable` se preferirmos liberdade). Decisão: usar `Select` padrão do shadcn com as opções da lista — campo opcional, sem obrigatoriedade.
- `CompraItem` ganha `evento_projeto?: string | null`.
- `save.mutationFn` passa `evento_projeto` no insert de `compra_itens`.
- `useEffect` de carregamento já faz `select("*")`, então virá automaticamente.

### Arquivos afetados
- `supabase/migrations/<novo>.sql` — `ALTER TABLE compra_itens ADD COLUMN evento_projeto text;`
- `src/components/CompraDialog.tsx` — reposicionar ID, adicionar campo Evento/Projeto por item, query de eventos.

### Observações
- Não altero comportamento de saídas/entradas (já usam `evento_projeto` na tabela `movimentacoes`).
- O secret do Google Sheets já está configurado (a função `listEventos` é usada em saídas hoje); se a planilha falhar, o select ainda mostra as 4 opções fixas.
