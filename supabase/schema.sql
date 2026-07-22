-- ═══════════════════════════════════════════════════════════════
-- InCiclo (CicloWay) — Schema de autenticação e perfis
-- Rode este script UMA VEZ no Supabase:
--   Painel → SQL Editor → New query → cole tudo → Run
-- ═══════════════════════════════════════════════════════════════

-- 1) Tabela de perfis (1 linha por usuário do Auth) ---------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nome       text not null,
  iniciais   text,
  role       text not null default 'employee' check (role in ('admin','employee')),
  dept       text,
  created_at timestamptz not null default now()
);

-- 2) Função utilitária: o usuário atual é admin? -----------------
-- SECURITY DEFINER evita recursão de RLS ao consultar profiles.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 3) Row Level Security ------------------------------------------
alter table public.profiles enable row level security;

-- Qualquer colaborador autenticado pode LER os perfis
-- (necessário para o organograma / lista de pessoas).
drop policy if exists "perfis_leitura_autenticados" on public.profiles;
create policy "perfis_leitura_autenticados"
  on public.profiles for select
  to authenticated
  using (true);

-- Cada um pode atualizar o PRÓPRIO perfil.
drop policy if exists "perfil_update_proprio" on public.profiles;
create policy "perfil_update_proprio"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins podem inserir/atualizar/apagar qualquer perfil.
drop policy if exists "perfis_admin_tudo" on public.profiles;
create policy "perfis_admin_tudo"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4) Gatilho: cria o perfil automaticamente ao criar o usuário ---
-- Puxa nome/iniciais/dept/role dos "User Metadata" informados no
-- momento de adicionar o usuário no painel do Supabase.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome, iniciais, role, dept)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'iniciais',
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    new.raw_user_meta_data->>'dept'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- PRONTO. Depois de rodar, cadastre pessoas em:
--   Painel → Authentication → Users → Add user
-- e preencha os "User Metadata" (Raw user meta data), por exemplo:
--   { "nome": "Caio Stagni", "iniciais": "CS", "role": "admin", "dept": "Consultoria" }
-- O perfil é criado sozinho pelo gatilho acima.
-- ═══════════════════════════════════════════════════════════════
