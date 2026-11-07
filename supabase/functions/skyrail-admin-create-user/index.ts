import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método não permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!url || !anonKey || !serviceKey || !authHeader) return response({ error: "Configuração do servidor incompleta." }, 500);

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return response({ error: "Sessão inválida." }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from("skyrail_profiles")
    .select("role,active").eq("id", authData.user.id).maybeSingle();
  if (profileError || !profile || profile.role !== "admin" || profile.active !== true) {
    return response({ error: "Somente administradores ativos podem cadastrar funcionários." }, 403);
  }

  let body: { username?: string; fullName?: string; password?: string };
  try { body = await req.json(); } catch { return response({ error: "Corpo JSON inválido." }, 400); }
  const username = String(body.username || "").trim().toLowerCase();
  const fullName = String(body.fullName || "").trim();
  const password = String(body.password || "");
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) return response({ error: "Usuário inválido: use 3 a 32 caracteres, sem espaços." }, 400);
  if (fullName.length < 2 || fullName.length > 100) return response({ error: "Informe o nome completo do funcionário." }, 400);
  if (password.length < 8 || password.length > 72) return response({ error: "A senha deve ter entre 8 e 72 caracteres." }, 400);

  const email = `${username}@login.skyrail.invalid`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { username, full_name: fullName },
  });
  if (createError || !created.user) return response({ error: createError?.message || "Não foi possível criar o usuário." }, 400);

  const { error: insertError } = await admin.from("skyrail_profiles").insert({
    id: created.user.id, username, full_name: fullName, role: "employee", active: true,
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return response({ error: insertError.code === "23505" ? "Esse usuário já existe." : "Falha ao gravar o perfil do funcionário." }, 400);
  }
  return response({ ok: true, user: { id: created.user.id, username, fullName, role: "employee" } }, 201);
});
