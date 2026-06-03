import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminOfModule } from "@/lib/conta-azul/auth-check.server";
import { listarFalhas, reprocessarFalhas } from "@/lib/conta-azul/sync.server";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const postSchema = z.object({
  from: dateSchema,
  to: dateSchema,
  alvo: z
    .array(
      z.object({
        recurso: z.enum(["contas_pagar", "contas_receber", "extrato"]),
        mes_from: dateSchema,
        mes_to: dateSchema,
      }),
    )
    .optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/contaazul/reprocessar-falhas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const guard = await requireAdminOfModule(request, "financeiro");
        if ("error" in guard) return json({ error: guard.error }, guard.status);
        const url = new URL(request.url);
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        if (!from || !to || !dateSchema.safeParse(from).success || !dateSchema.safeParse(to).success) {
          return json({ error: "Parâmetros from/to obrigatórios (YYYY-MM-DD)" }, 400);
        }
        try {
          const falhas = await listarFalhas(from, to);
          return json({ falhas });
        } catch (e: any) {
          return json({ error: String(e?.message ?? e) }, 500);
        }
      },
      POST: async ({ request }) => {
        const guard = await requireAdminOfModule(request, "financeiro");
        if ("error" in guard) return json({ error: guard.error }, guard.status);
        let body: unknown;
        try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
        const parsed = postSchema.safeParse(body);
        if (!parsed.success) return json({ error: "Payload inválido" }, 400);
        try {
          const r = await reprocessarFalhas(parsed.data.from, parsed.data.to, parsed.data.alvo);
          return json(r);
        } catch (e: any) {
          return json({ error: String(e?.message ?? e) }, 500);
        }
      },
    },
  },
});
