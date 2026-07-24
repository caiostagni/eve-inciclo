-- ═══════════════════════════════════════════════════════════════
-- InCiclo (CicloWay) — Schema Neon (Postgres)
-- Rode uma vez: `npm run init-db`  (ou cole no SQL Editor do Neon)
-- ═══════════════════════════════════════════════════════════════

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,               -- bcrypt (nunca a senha em texto)
  nome          text not null,
  iniciais      text,
  role          text not null default 'employee' check (role in ('admin','employee')),
  dept          text,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists users_email_idx on users (lower(email));
