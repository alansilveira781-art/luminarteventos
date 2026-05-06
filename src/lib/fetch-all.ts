import { supabase } from "@/integrations/supabase/client";

/**
 * Busca todas as linhas de uma tabela paginando para contornar
 * o limite padrão de 1000 linhas do Supabase.
 */
export async function fetchAllRows<T = any>(
  table: string,
  select = "*",
  orderBy?: { column: string; ascending?: boolean },
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
