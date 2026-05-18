import { createFileRoute } from "@tanstack/react-router";
import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import { exchangeCodeForTokens, saveTokens } from "@/lib/conta-azul/client.server";

export const Route = createFileRoute("/api/contaazul/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        const cookieState = getCookie("ca_oauth_state");
        deleteCookie("ca_oauth_state", { path: "/" });

        const back = (msg: string, ok = false) =>
          Response.redirect(
            `${url.origin}/financeiro/conta-azul?${ok ? "connected=1" : `error=${encodeURIComponent(msg)}`}`,
            302,
          );

        if (error) return back(`Autorização negada: ${error}`);
        if (!code || !state) return back("Resposta inválida do Conta Azul");
        if (!cookieState || cookieState !== state) return back("State inválido (sessão expirada)");

        try {
          const redirectUri = `${url.origin}/api/contaazul/oauth/callback`;
          const tokens = await exchangeCodeForTokens(code, redirectUri);
          await saveTokens(tokens);
          return back("ok", true);
        } catch (e: any) {
          return back(String(e?.message ?? e));
        }
      },
    },
  },
});
