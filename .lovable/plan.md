# Input monetário "cents-as-you-type" em R$

## Comportamento

Em qualquer campo de dinheiro do sistema o usuário digita só dígitos. A vírgula fica fixa nas duas últimas casas e o restante vai sendo deslocado:

```text
(vazio)        R$ 0,00
1              R$ 0,01
12             R$ 0,12
123            R$ 1,23
1234           R$ 12,34
12345          R$ 123,45
123456         R$ 1.234,56
1234567        R$ 12.345,67
```

- Backspace apaga o último dígito (12345 → 1234 → 123…).
- Campo vazio salva como `0` (ou `null`, mantendo o comportamento atual de cada tela).
- Prefixo "R$" fixo dentro do input (cinza, não editável).
- Separador de milhar com ponto e decimal com vírgula (pt-BR).
- `inputMode="decimal"` para abrir teclado numérico no mobile.
- Aceita colar valores formatados ("1.234,56", "1234.56", "R$ 12,00") — normaliza tudo para centavos.

## Novo componente

`src/components/MoneyInput.tsx`

```ts
type Props = {
  value: number | null;          // valor em reais (ex.: 1234.56)
  onChange: (v: number) => void; // sempre devolve number em reais
  allowNull?: boolean;           // se true, campo vazio → onChange(null as any)
  ...InputHTMLAttributes (menos value/onChange/type)
}
```

Internamente trabalha em centavos (inteiro). Conversão:
- entrada: `Math.round(value * 100)` na inicialização / quando `value` muda externamente.
- saída: `cents / 100` no `onChange`.

Renderiza um wrapper com o "R$" absoluto à esquerda e o `<Input>` com `pl-9 text-right tabular-nums`, reaproveitando o input shadcn já existente.

## Substituições no sistema

Trocar `<Input type="number">` / `<NumberInput>` por `<MoneyInput>` apenas em campos de dinheiro:

- **Estoque / Movimentações**
  - `src/routes/entradas.tsx` — `valor_unitario` por linha (form de criação e edição).
  - `src/components/patrimonio/Movimentacoes.tsx` — `valor_unitario`.
- **Comercial**
  - `src/components/comercial/PropostaWizard.tsx` — preços/valores da proposta.
  - `src/components/comercial/CardDialog.tsx` — valor do card.
  - `src/routes/comercial.catalogo.tsx` — preço dos itens do catálogo.
- **Compras / Demandas**
  - `src/components/CompraDialog.tsx` — valor estimado.
  - `src/components/DemandaDialog.tsx` — valor estimado.
- **Financeiro / Contábil**
  - `src/routes/contabil.recebimentos.tsx` — valor recebido.
  - `src/routes/contabil.notas.tsx` — valor da nota.
  - `src/routes/contabil.configuracao.tsx` — parâmetros monetários.
- **Cadastros**
  - `src/components/forms/ItemForm.tsx` — preço de referência / custo médio.
- **Edição em massa**
  - `src/components/BulkEditDialog.tsx` — quando o campo selecionado for monetário.

Campos que **não** mudam: quantidades (inteiras ou fracionárias), códigos, NCM, ano, percentuais, qualquer coisa que não represente moeda.

## Itens fora do escopo

- Quantidades, percentuais, datas, telefones — permanecem como hoje.
- Não vou alterar o backend / schema; o valor continua sendo salvo como `number` em reais.
- Não vou criar máscara para inputs de quantidade com decimais (ex.: 1,5 m²). Se quiser depois, é outro componente.

## Validação

- O componente sempre devolve `number ≥ 0`.
- Mantenho os `toast.error` existentes ("informe um valor", etc.) — eles validam `value <= 0` e seguem funcionando.

## Checagem final

Depois de aplicar, abro Entradas, Comercial → Proposta e Compras no preview e digito alguns valores para confirmar:
1. dígito vai sempre para os centavos;
2. backspace funciona;
3. salvar grava o número certo (sem fator 100);
4. reabrir o registro reexibe formatado.
