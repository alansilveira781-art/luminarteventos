ALTER TABLE public.itens REPLICA IDENTITY FULL;
ALTER TABLE public.movimentacoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes;