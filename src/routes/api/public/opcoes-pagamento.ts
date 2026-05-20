import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/opcoes-pagamento")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => {
        const [p, c] = await Promise.all([
          (supabaseAdmin as any).from("parcelamentos").select("nome").order("nome"),
          (supabaseAdmin as any).from("condicoes_pagamento").select("nome").order("nome"),
        ]);
        return new Response(
          JSON.stringify({
            parcelamentos: (p.data ?? []).map((r: any) => r.nome),
            condicoes_pagamento: (c.data ?? []).map((r: any) => r.nome),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      },
    },
  },
});
