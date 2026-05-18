import { createFileRoute } from "@tanstack/react-router";
import { disconnect, getConnectionInfo } from "@/lib/conta-azul/client.server";
import { requireAdminOfModule } from "@/lib/conta-azul/auth-check.server";

export const Route = createFileRoute("/api/contaazul/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const guard = await requireAdminOfModule(request, "financeiro");
        if ("error" in guard) {
          return new Response(JSON.stringify({ error: guard.error }), {
            status: guard.status,
            headers: { "Content-Type": "application/json" },
          });
        }
        const info = await getConnectionInfo();
        return new Response(JSON.stringify(info), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      DELETE: async ({ request }) => {
        const guard = await requireAdminOfModule(request, "financeiro");
        if ("error" in guard) {
          return new Response(JSON.stringify({ error: guard.error }), {
            status: guard.status,
            headers: { "Content-Type": "application/json" },
          });
        }
        await disconnect();
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
