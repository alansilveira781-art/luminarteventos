## Mudanças no módulo Comercial → Quadro de Vendas

### 1. Formulário "Novo lead" (CardDialog)
- Substituir o campo único **Data do evento** por **período** com dois campos: **Data início** e **Data fim** (ambos `type="date"`). O card no Kanban passa a mostrar "DD/MM/AAAA – DD/MM/AAAA" (ou só uma data se forem iguais).
- Corrigir o bug dos campos numéricos (valor estimado, quantidade etc.): hoje usam `value={number}` + `Number(e.target.value)`, o que impede apagar o `0`. Vamos armazenar como string controlada no formulário e converter para número só ao salvar — assim o usuário consegue limpar e digitar normalmente.
- Renomear **Responsável** para **Consultor(a)** e trocar o `Input` por um `Select` (combobox) com:
  - Pádua Costa
  - Romulo Manoel
  - opção **"+ Adicionar consultor(a)"** que abre um pequeno prompt/dialog para cadastrar um novo nome.
- A lista de consultores fica persistida em `localStorage` (mesma estratégia já usada em `src/lib/comercial/store.ts`).

### 2. Tipos e store (`src/lib/comercial/types.ts`, `store.ts`)
- `ComercialCard.eventoData: string` → `eventoDataInicio: string; eventoDataFim: string` (com migração simples lendo o valor antigo).
- `TIPOS_EVENTO` passa a ser: **Cenografia, Casamento, Corporativo, Stand**.
- Novo tipo `Consultor = { id; nome }` + funções `listConsultores / addConsultor`.

### 3. Wizard de Proposta (`PropostaWizard.tsx`)
- Quando aberto a partir de um card, pré-preencher:
  - **Cliente**: nome, telefone e email (buscando o `Cliente` vinculado pelo `clienteId` do card, com fallback para o `clienteNome`).
  - **Evento**: nome/local (a partir de `eventoNome`), `dataInicio` e `dataFim` do card, e tipo se já estiver definido.
  - **Consultor(a)**: o consultor do card.
- Na etapa **Evento**:
  - Remover os campos **Horário de início** e **Horário de término**.
  - Trocar **Data do evento** por **Data início / Data fim**.
  - Tipo de evento limitado às 4 opções acima.
- Aplicar a mesma correção dos inputs numéricos (permitir apagar o 0) em toda a etapa de Itens, Custos e Resumo.

### 4. Nova estrutura da etapa "Itens": Ambiente → Item → Descrição
Substituir a tabela plana atual por uma estrutura hierárquica de 3 níveis:

```text
Ambiente "Recepção"
  ├── Imagens do ambiente [upload múltiplo]
  ├── Item "Painel LED"
  │     ├── Descrição "Painel 3x2m P3" — qtd, valor unit.
  │     └── Descrição "Estrutura box truss" — qtd, valor unit.
  └── Item "Mobiliário"
        └── Descrição "Sofá branco" — qtd, valor unit.
Ambiente "Palco"
  └── ...
```

- Cada **Ambiente** tem: `nome`, `imagens: string[]` (data URLs / base64 em localStorage), e uma lista de **Itens**.
- Cada **Item** tem: `nome` e uma lista de **Descrições**.
- Cada **Descrição** tem: `descricao`, `unidade`, `quantidade`, `valorUnitario`. O subtotal é calculado por descrição e agregado por item/ambiente e na proposta.
- UI: cards/accordions colapsáveis por ambiente, botões **+ Adicionar ambiente**, **+ Adicionar item**, **+ Adicionar descrição** e ações de remover em cada nível.
- O catálogo existente (`CATALOGO`) vira sugestão para o campo Item (autocomplete simples), mantendo a lógica.

### 5. Imagens por ambiente
- Componente de upload em cada ambiente: aceita múltiplas imagens, converte para data URL (`FileReader.readAsDataURL`), exibe miniaturas com botão de remover.
- Persistência junto com a proposta no `localStorage` (mesmo store atual).
- Observação: como hoje todo o módulo Comercial é client-side em localStorage, isso evita dependência de backend. Se no futuro mover para Supabase Storage, o shape `ambiente.imagens: string[]` permanece compatível (basta trocar data URLs por URLs públicas).

### 6. Custos e Resumo
- Sem mudanças funcionais (você confirmou que está bom). Apenas a correção dos campos numéricos para permitir apagar o 0.

---

### Arquivos que serão tocados
- `src/lib/comercial/types.ts` — novos tipos (`Ambiente`, `ItemAmbiente`, `Descricao`, `Consultor`, período de datas, novos `TIPOS_EVENTO`).
- `src/lib/comercial/store.ts` — consultores + migração leve do shape antigo.
- `src/components/comercial/CardDialog.tsx` — período, consultor, fix de inputs numéricos.
- `src/components/comercial/PropostaWizard.tsx` — pré-preenchimento, etapa Evento sem horário, nova etapa Itens hierárquica, upload de imagens por ambiente, fix de inputs numéricos.
- `src/routes/comercial.index.tsx` — exibição do período no card.
- `src/components/comercial/DetalhesDrawer.tsx` — ajustar para mostrar período/consultor (read-only).
- `src/lib/comercial/pdf.ts` — atualizar geração de PDF para a nova estrutura Ambiente → Item → Descrição (mantendo o layout atual onde fizer sentido).

### Pontos a confirmar antes de eu implementar
1. **Imagens em base64 (localStorage)** está ok para começar? Funciona perfeito para poucas imagens por proposta, mas pode ficar pesado se forem muitas/grandes. Alternativa é usar Supabase Storage (criamos bucket dedicado).
2. Os cards existentes com `eventoData` único — posso assumir como `dataInicio = dataFim = valor antigo` na migração?
