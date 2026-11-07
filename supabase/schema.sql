-- SkyRail L17: perfis e permissões de funcionários.
-- Execute no SQL Editor do Supabase após criar o primeiro usuário administrador.
create table if not exists public.skyrail_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  full_name text not null,
  role text not null default 'employee' check (role in ('admin','employee')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.skyrail_profiles enable row level security;

-- Função SECURITY DEFINER evita recursão da política ao verificar o papel admin.
create or replace function public.skyrail_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.skyrail_profiles
    where id = (select auth.uid()) and role = 'admin' and active = true
  );
$$;
revoke all on function public.skyrail_is_admin() from public;
grant execute on function public.skyrail_is_admin() to authenticated;

-- Cada funcionário consulta apenas o próprio perfil; administradores consultam todos.
drop policy if exists "profile_read_self_or_admin" on public.skyrail_profiles;
create policy "profile_read_self_or_admin" on public.skyrail_profiles
for select to authenticated
using (id = (select auth.uid()) or public.skyrail_is_admin());

-- Não habilitar INSERT/UPDATE/DELETE público. A Edge Function administrativa usa service role.
revoke all on public.skyrail_profiles from anon;
grant select on public.skyrail_profiles to authenticated;
revoke insert, update, delete on public.skyrail_profiles from authenticated;

-- Bootstrap do administrador inicial:
-- 1) No Dashboard > Authentication > Users, crie um usuário com e-mail
--    admin@login.skyrail.invalid, marque e-mail como confirmado e defina a senha.
-- 2) Copie o UUID e execute (substitua UUID e nome):
-- insert into public.skyrail_profiles (id, username, full_name, role)
-- values ('UUID-DO-USUARIO', 'admin', 'Administrador SkyRail', 'admin');
