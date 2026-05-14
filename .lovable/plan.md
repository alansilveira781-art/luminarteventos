## Módulo Comercial — Plano de Implementação

Módulo novo, isolado, seguindo o padrão dos módulos existentes (Compras/Financeiro). Sem alterar componentes ou rotas dos outros módulos. Persistência **localStorage** conforme solicitado (MVP).

### 1. Sidebar
Editar `src/components/AppSidebar.tsx`:
- Adicionar grupo **"Comercial"** com ícone `Briefcase`
- 4 itens: Quadro de Vendas (`/comercial`), Propostas (`/comercial/propostas`), Validações (`/comercial/validacoes`), Clientes (`/comercial/clientes`)
- Adicionar `/comercial` em `COMERCIAL_ROUTES` e no `getContext()`
- Liberar acesso por `hasModule("comercial")` ou admin (mesmo padrão dos outros)

### 2. Rotas (TanStack file-based)
```
src/routes/comercial.tsx              → layout + guard de módulo
src/routes/comercial.index.tsx        → Quadro de Vendas (Kanban)
src/routes/comercial.propostas.tsx    → Lista de propostas aprovadas
src/routes/comercial.validacoes.tsx   → Aprovação interna
src/routes/comercial.clientes.tsx     → CRM
```

### 3. Camada de dados (`src/lib/comercial/`)
- `storage.ts` — wrapper genérico `read<T>(key)` / `write<T>(key, val)` com fallback seguro
- `types.ts` — tipos `Card`, `Proposta`, `Cliente`, `ItemProposta`, `CustoExtra`, status enums
- `store.ts` — hooks `useCards()`, `usePropostas()`, `useClientes()` com estado em React + sync com localStorage; helpers `moveCard`, `createProposta`, `aprovarProposta`, `reprovarProposta`, `vincularClienteEvento`
- `catalogo.ts` — lista base de 8 itens pré-cadastrados (Buffet, Decoração, DJ, etc.)

### 4. Quadro de Vendas (Kanban)
Arquivo: `src/routes/comercial.index.tsx` + componentes em `src/components/comercial/`
- 6 colunas: Lead, Projeto, Orçamento Enviado, Negociação, Fechamento, Perda — cores distintas por status
- DnD com `@dnd-kit/core` + `@dnd-kit/sortable` (já instalados ou instalar)
- Componentes: `KanbanBoard`, `KanbanColumn`, `KanbanCard`
- Card mostra: cliente, evento, data, valor estimado, responsável, observações
- Ações: "Marcar venda" (→ Fechamento), "Marcar perda" (modal motivo obrigatório), "Editar" (modal), "Detalhes" (Drawer lateral)
- Coluna Projeto: botão extra "Criar Proposta" abre o wizard
- Coluna Perda: tag/tooltip com motivo
- Botão "Novo Lead" no topo do quadro

### 5. Wizard de Proposta (5 etapas)
Componente: `src/components/comercial/PropostaWizard.tsx` em `Dialog` com `Progress`
- Etapa 1 — Cliente (nome, telefone, email) — autopreenche se card já tem cliente
- Etapa 2 — Evento (tipo select, data, início, término, local, cidade, observações)
- Etapa 3 — Itens: lista do catálogo com botão "Adicionar"; tabela editável (qtd, valor unit., subtotal calculado)
- Etapa 4 — Custos extras (frete, montagem, desmontagem, outros[descrição+valor])
- Etapa 5 — Resumo (subtotal itens, total custos, total final, margem %, validade)
- Ao concluir: cria/atualiza Cliente, cria Proposta com status `aguardando_aprovacao`, vincula `cardId`

### 6. Validações
`src/routes/comercial.validacoes.tsx`
- Lista propostas com status `aguardando_aprovacao` ou `em_revisao`
- Cada item expansível mostra: cliente, evento, itens, totais, responsável
- Ações: Aprovar → status `enviado` + card vai para "Orçamento Enviado"; Reprovar → status `em_revisao`; Editar → reabre wizard

### 7. Propostas
`src/routes/comercial.propostas.tsx`
- Tabela: cliente, evento, data, valor, status (Enviado/Em negociação/Fechado/Perdido)
- Ações por linha: alterar status (Select), Gerar PDF (jsPDF), Enviar (toast simulado)
- PDF: `src/lib/comercial/pdf.ts` usando `jsPDF` com cabeçalho "Logo da Empresa", dados cliente/evento, tabela itens, custos, total, validade, rodapé
- Sincroniza status com card do Kanban quando aplicável (Fechado → coluna Fechamento; Perdido → coluna Perda c/ motivo opcional)

### 8. Clientes (CRM)
`src/routes/comercial.clientes.tsx`
- Lista de clientes (nome, telefone, email, status atual)
- Drawer/Dialog "Detalhes": timeline de eventos (criação card, proposta enviada, aprovação, fechamento), lista de propostas vinculadas, lista de eventos
- Botão "Criar novo lead" → cria Card vinculado já com dados do cliente

### 9. Automações / vínculos
- Drag-drop atualiza `card.status`
- Wizard cria/atualiza cliente por email (chave) + grava proposta com `clienteId`/`cardId`
- Aprovação: `proposta.status = 'enviado'` + `card.status = 'orcamento_enviado'`
- Card → Fechamento: `proposta.status = 'fechado'` se houver proposta vinculada
- Card → Perda: pede motivo (obrigatório); se houver proposta, `proposta.status = 'perdido'`
- Toda mutação grava no localStorage e dispara re-render via `useSyncExternalStore`

### 10. Dependências
- `@dnd-kit/core`, `@dnd-kit/sortable` (instalar se ausentes)
- `jspdf` e `jspdf-autotable` (instalar)

### 11. Permissão de módulo
Para usuários não-admin verem o módulo, adicionar `comercial` à lista de módulos em `Administração → Módulos` (registro feito via mesmo fluxo dos outros). Admin já vê tudo.

### Notas
- Persistência em localStorage como pedido — sem migração Supabase para este módulo
- Visual herda tokens do design system (sem cores hardcoded), botões shadcn, Drawer/Dialog/Progress já disponíveis
- Nenhum arquivo dos módulos Estoque/Compras/Financeiro será alterado, exceto `AppSidebar.tsx` (adição de itens) e `routeTree.gen.ts` (auto-gerado)
