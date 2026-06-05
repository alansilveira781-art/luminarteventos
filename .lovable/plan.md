# Ajustar mensagens de sucesso (toast)

## Objetivo
Tornar os feedbacks de sucesso mais descritivos após operações de cadastro/edição nos módulos principais.

## Alterações por arquivo

### 1. `src/routes/fornecedores.tsx`
- Mutação `mut` (criar/editar fornecedor): alterar `toast.success("Salvo")` para:
  - `"Fornecedor cadastrado"` quando for criação (`!p.id`)
  - `"Fornecedor atualizado"` quando for edição (`p.id`)

### 2. `src/routes/solicitantes.tsx`
- Mutação `mut` (criar/editar solicitante): alterar `toast.success("Salvo")` para:
  - `"Solicitante cadastrado"` quando for criação (`!p.id`)
  - `"Solicitante atualizado"` quando for edição (`p.id`)
- Mutação `del` (excluir): alterar `toast.success("Removido")` para `"Solicitante removido"`

### 3. `src/routes/estoque.index.tsx`
- Mutação `mut` (criar/editar item): alterar `toast.success("Item salvo")` para:
  - `"Item registrado"` quando for criação (`!payload.id`)
  - `"Alterações salvas"` quando for edição (`payload.id`)

## Critérios de aceite
- Todas as mensagens devem usar `toast.success(...)` do `sonner`.
- Nenhuma outra lógica deve ser alterada.
- A mensagem deve variar conforme o tipo da operação (cadastro vs. edição).