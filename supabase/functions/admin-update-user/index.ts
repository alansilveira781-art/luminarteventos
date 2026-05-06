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

    const { user_id, email, password, display_name } = await req.json() as {
      user_id: string; email?: string; password?: string; display_name?: string;
    };
    if (!user_id) return json({ error: "user_id obrigatório" }, 400);

    const updates: any = {};
    if (email) updates.email = email;
    if (password) updates.password = password;
    if (display_name !== undefined) updates.user_metadata = { display_name };

    if (Object.keys(updates).length) {
      const { error: upErr } = await admin.auth.admin.updateUserById(user_id, updates);
      if (upErr) return json({ error: upErr.message }, 400);
    }

    const profilePatch: any = {};
    if (email) profilePatch.email = email;
    if (display_name !== undefined) profilePatch.display_name = display_name;
    if (Object.keys(profilePatch).length) {
      await admin.from("profiles").update(profilePatch).eq("id", user_id);
    }

    return json({ ok: true });
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
