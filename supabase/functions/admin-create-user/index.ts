import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return json({ error: "Não autorizado" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: isAdminData } = await admin.rpc("is_admin", { _user_id: userData.user.id });
    if (!isAdminData) return json({ error: "Apenas administradores" }, 403);

    const body = await req.json();
    const { email, password, display_name, is_admin, modulo_ids } = body as {
      email: string; password: string; display_name?: string; is_admin?: boolean; modulo_ids?: string[];
    };
    if (!email || !password) return json({ error: "E-mail e senha obrigatórios" }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name },
    });
    if (createErr) return json({ error: createErr.message }, 400);

    const newId = created.user!.id;

    await admin.from("profiles").upsert({ id: newId, email, display_name: display_name ?? null });
    await admin.from("user_roles").insert({ user_id: newId, role: is_admin ? "admin" : "user" });
    if (!is_admin && modulo_ids?.length) {
      await admin.from("user_modulos").insert(modulo_ids.map((modulo_id) => ({ user_id: newId, modulo_id })));
    }

    return json({ ok: true, user_id: newId });
  } catch (e: any) {
    return json({ error: e.message ?? "Erro" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
