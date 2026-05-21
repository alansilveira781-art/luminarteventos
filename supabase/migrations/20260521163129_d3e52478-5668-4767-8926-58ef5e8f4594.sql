CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_itens_codigo ON public.itens (codigo);
CREATE INDEX IF NOT EXISTS idx_itens_codigo_proprio ON public.itens (codigo_proprio);
CREATE INDEX IF NOT EXISTS idx_itens_categoria ON public.itens (categoria);
CREATE INDEX IF NOT EXISTS idx_itens_status ON public.itens (status);
CREATE INDEX IF NOT EXISTS idx_itens_created_at ON public.itens (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_itens_nome_trgm ON public.itens USING gin (nome gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_mov_tipo_data ON public.movimentacoes (tipo, data_movimento DESC);
CREATE INDEX IF NOT EXISTS idx_mov_item ON public.movimentacoes (item_id);
CREATE INDEX IF NOT EXISTS idx_mov_fornecedor ON public.movimentacoes (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_mov_solicitante ON public.movimentacoes (solicitante_id);
CREATE INDEX IF NOT EXISTS idx_mov_saida_origem ON public.movimentacoes (saida_origem_id);
CREATE INDEX IF NOT EXISTS idx_mov_saida_status ON public.movimentacoes (saida_status);
CREATE INDEX IF NOT EXISTS idx_mov_created_at ON public.movimentacoes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mov_requisicao ON public.movimentacoes (requisicao_numero);

CREATE INDEX IF NOT EXISTS idx_movitens_mov ON public.movimentacao_itens (movimentacao_id);
CREATE INDEX IF NOT EXISTS idx_movitens_item ON public.movimentacao_itens (item_id);

CREATE INDEX IF NOT EXISTS idx_forn_documento ON public.fornecedores (documento);
CREATE INDEX IF NOT EXISTS idx_forn_status ON public.fornecedores (status);
CREATE INDEX IF NOT EXISTS idx_forn_nome_trgm ON public.fornecedores USING gin (nome gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sol_status ON public.solicitantes (status);
CREATE INDEX IF NOT EXISTS idx_sol_nome_trgm ON public.solicitantes USING gin (nome gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_compras_status ON public.compras (status);
CREATE INDEX IF NOT EXISTS idx_compras_status_ordem ON public.compras (status, ordem);
CREATE INDEX IF NOT EXISTS idx_compras_created_at ON public.compras (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compras_fornecedor ON public.compras (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_solicitante ON public.compras (solicitante_id);
CREATE INDEX IF NOT EXISTS idx_compras_numero ON public.compras (numero);

CREATE INDEX IF NOT EXISTS idx_compraitens_compra ON public.compra_itens (compra_id);
CREATE INDEX IF NOT EXISTS idx_compraitens_item ON public.compra_itens (item_id);

CREATE INDEX IF NOT EXISTS idx_pat_itens_cod ON public.pat_itens (cod);
CREATE INDEX IF NOT EXISTS idx_pat_itens_categoria ON public.pat_itens (categoria);
CREATE INDEX IF NOT EXISTS idx_pat_itens_created_at ON public.pat_itens (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patmov_item ON public.pat_movimentacoes (item_id);
CREATE INDEX IF NOT EXISTS idx_patmov_tipo_data ON public.pat_movimentacoes (tipo, data_movimento DESC);
CREATE INDEX IF NOT EXISTS idx_patmov_saida_origem ON public.pat_movimentacoes (saida_origem_id);

CREATE INDEX IF NOT EXISTS idx_demandas_status ON public.demandas (status);
CREATE INDEX IF NOT EXISTS idx_demandas_created_at ON public.demandas (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_user_lida_created ON public.notificacoes (user_id, lida, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cnf_empresa_data ON public.contabil_notas_fiscais (empresa, data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_cnf_status ON public.contabil_notas_fiscais (status);