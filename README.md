# InCiclo — Portal interno da CicloWay

Intranet interna com login por colaborador. Site estático (`index.html`) + **Supabase**
(autenticação e banco) + deploy na **Vercel**.

- `index.html` — a aplicação (todas as telas).
- `config.js` — suas chaves públicas do Supabase (você preenche).
- `supabase/schema.sql` — cria a tabela de perfis, a segurança (RLS) e o gatilho.

---

## Passo a passo (você clica, eu preparei o código)

### 1. Criar o projeto no Supabase
1. Acesse <https://supabase.com/dashboard> → **New project**.
2. Nome: `inciclo` · defina uma senha de banco forte · região **South America (São Paulo)**.
3. Aguarde ~2 min até provisionar.

### 2. Rodar o schema (cria tabela + segurança)
1. No projeto: menu lateral → **SQL Editor** → **New query**.
2. Cole **todo** o conteúdo de `supabase/schema.sql` e clique **Run**.
3. Deve aparecer "Success. No rows returned".

### 3. Fechar o cadastro público (só admin cria contas)
1. Menu → **Authentication** → **Sign In / Providers** → **Email**.
2. **Desligue** "Allow new users to sign up" e salve.
   *(O app só faz login; ninguém se cadastra sozinho.)*

### 4. Cadastrar os colaboradores
Para cada pessoa: **Authentication** → **Users** → **Add user** → **Create new user**.
- **Email** e **Password** (senha inicial).
- Marque **Auto Confirm User**.
- Em **User Metadata** (Raw user meta data) cole um JSON, ex.:
  ```json
  { "nome": "Caio Stagni", "iniciais": "CS", "role": "admin", "dept": "Consultoria" }
  ```
  - `role`: `admin` (acesso total) ou `employee` (colaborador).
- O perfil é criado automaticamente pelo gatilho. Comece por **você como `admin`**.

### 5. Pegar as chaves e colar no `config.js`
1. Menu → **Project Settings** → **Data API**: copie **Project URL**.
2. **Project Settings** → **API Keys**: copie a **anon / public** key (começa com `eyJ...`).
3. Abra `config.js` e substitua os dois valores. **NUNCA** use a chave `service_role`.

### 6. Subir no GitHub
```bash
git add .
git commit -m "InCiclo: login real com Supabase"
gh repo create cicloway-inciclo --private --source=. --push   # ou pelo site do GitHub
```

### 7. Deploy na Vercel
1. <https://vercel.com/new> → **Import** o repositório `cicloway-inciclo`.
2. Framework Preset: **Other** · Root: `./` · sem build command (site estático).
3. **Deploy**. Em ~30s você recebe a URL (ex.: `inciclo.vercel.app`).
4. (Opcional) **Settings → Domains** → adicionar `intranet.cicloway.com.br`.

---

## Como funciona a segurança
- Senhas ficam no **Supabase Auth** (hash), nunca no código.
- O `config.js` traz só a **anon key**, que é pública por design.
- O acesso aos dados é barrado pelo **Row Level Security** do banco: sem login válido,
  nenhuma linha é retornada. Ver `supabase/schema.sql`.

## Dúvidas comuns
- **Esqueci a senha de alguém** → Authentication → Users → (usuário) → *Reset password* / *Send recovery*.
- **Tornar alguém admin** → edite o `role` na tabela `profiles` (Table Editor) para `admin`.
- **Novas telas depois** → editamos `index.html`; para dados editáveis, criamos novas tabelas no Supabase.
