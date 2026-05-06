import { supabase } from "@/integrations/supabase/client";

const PREFIX = "SKU-";

/**
 * Generates the next SKU code based on the highest existing SKU-N in the itens table.
 * Considers any code matching SKU-<number> (case-insensitive) and returns SKU-(max+1).
 * Falls back to SKU-1 if there are no existing SKU codes.
 */
export async function generateNextSku(): Promise<string> {
  const { data, error } = await supabase
    .from("itens")
    .select("codigo")
    .ilike("codigo", `${PREFIX}%`)
    .limit(2000);
  if (error) throw error;

  let max = 0;
  for (const row of data ?? []) {
    const m = String((row as any).codigo ?? "").match(/^SKU-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${PREFIX}${max + 1}`;
}
