## Objetivo
Concluir a conexão OAuth com o Conta Azul (CNPJ Luminart Eventos) na aba já existente **Financeiro → Conta Azul**. Nada de telas novas de A Pagar / A Receber / Extrato.

## Estado atual (verificado)
- Fluxo OAuth já está pronto no código:
  - `POST /api/contaazul/oauth/prepare` — gera `state`, salva cookie, retorna URL de autorização
  - `GET  /api/contaazul/oauth/callback` — valida `state`, troca `code` por tokens, salva em `conta_azul_credentials`, redireciona para `/financeiro/conta-azul?connected=1`
  - `GET/DELETE /api/contaazul/status` — consulta/limpa conexão
- UI em `src/routes/financeiro.conta-azul.tsx` com botão **Conectar**, status, desconectar e (futuro) sync.
- Secrets `CONTA_AZUL_CLIENT_ID` e `CONTA_AZUL_CLIENT_SECRET` cadastrados.
- Banco: `conta_azul_credentials` está **vazio** → a conexão ainda não foi concluída.

## O que falta (passo a passo)

### 1. Confirmar Redirect URI no painel Conta Azul Developers
No app criado em developers.contaazul.com, o campo de URL deve conter exatamente:
```
https://luminarteventos.lovable.app/api/contaazul/oauth/callback
```
Sem barra final, sem espaços. Salvar.

### 2. Publicar o projeto
O Conta Azul só vai aceitar o callback no domínio publicado. Se houve mudanças desde a última publicação, publicar novamente.

### 3. Conectar
Acessar **Financeiro → Conta Azul** no domínio publicado (não no preview) → clicar **Conectar Conta Azul** → autorizar no Conta Azul → ser redirecionado de volta com toast "Conta Azul conectado com sucesso".

### 4. Diagnóstico em caso de erro
Se aparecer toast vermelho ou voltar com `?error=...`, eu coleto:
- Mensagem exata mostrada
- Logs do server (`oauth.prepare` e `oauth.callback`)
- Verifico `redirect_uri`, `client_id`, validade do `state` (cookie sameSite=lax, expira em 10min) e a resposta do endpoint de token do Conta Azul

Causas mais prováveis e correções já mapeadas:
- **"redirect_uri mismatch"** → URL no painel difere do que o app envia; ajustar no painel.
- **"State inválido (sessão expirada)"** → o usuário levou mais de 10 min ou trocou de domínio entre o `prepare` e o `callback`. Refazer no mesmo domínio (publicado).
- **"invalid_client"** → secret incorreto; rotacionar `CONTA_AZUL_CLIENT_SECRET`.
- **401 ao clicar Conectar** → usuário não é admin do módulo Financeiro; ajustar permissão.

## Alterações de código previstas
Nenhuma por padrão. Só vou mexer em código se o passo 4 revelar bug real no fluxo (ex.: corrigir construção da `redirect_uri`, ajuste de escopos em `buildAuthorizeUrl`, etc.).

## Fora de escopo
- Telas de Contas a Pagar / Receber / Extrato
- Sync automático (cron)
- Suporte multi-CNPJ (só Luminart Eventos)
- Integração com Dashboard Financeiro

## Próxima ação sua
Confirmar passos 1 e 2 e clicar em **Conectar**. Me diga o que acontece (ou cole a mensagem de erro) que eu sigo a partir daí.
