# InCiclo — Portal interno da CicloWay

Intranet interna com login por colaborador. Frontend estático (`index.html`) +
**funções serverless na Vercel** (`/api`) + banco **Neon** (Postgres).

A senha do banco e o segredo dos cookies ficam **só no servidor** — nunca vão para o
navegador. O login é validado no backend (bcrypt) e a sessão é um **cookie JWT httpOnly**.

## Estrutura
```
index.html          A aplicação (todas as telas)
api/login.js        POST e-mail+senha → valida (bcrypt) → cria cookie de sessão
api/me.js           Restaura a sessão a partir do cookie (usado ao recarregar)
api/logout.js       Encerra a sessão
lib/auth.js         Núcleo: Neon, JWT (jose) e cookies
db/schema.sql       Tabela `users`
scripts/init-db.mjs      Cria as tabelas no Neon        (npm run init-db)
scripts/create-user.mjs  Cria/atualiza um colaborador   (npm run criar-usuario)
```

## Pré-requisito
Ter **Node.js 18+** instalado (`node --version`). Se não tiver: <https://nodejs.org>.

---

## Passo a passo

### 1. Banco no Neon
1. <https://console.neon.tech> → **New Project** (região **AWS South America / São Paulo**).
2. Copie a **Connection string** (use a versão **Pooled connection**).

### 2. Configurar variáveis locais
```bash
cp .env.example .env
```
No `.env`, preencha:
- `DATABASE_URL` = a connection string do Neon.
- `JWT_SECRET` = um segredo aleatório forte. Gere com:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

### 3. Instalar dependências e criar as tabelas
```bash
npm install
npm run init-db
```

### 4. Cadastrar os colaboradores (admin cria)
```bash
npm run criar-usuario
```
Responda e-mail, senha inicial, nome, papel (`admin`/`employee`) e departamento.
Comece por **você como `admin`**. Rode quantas vezes precisar (repetir o e-mail
atualiza a pessoa). As iniciais são calculadas do nome automaticamente.

### 5. Testar localmente
```bash
npm run dev        # roda `vercel dev` — sobe o site + as funções /api
```
Abra o endereço mostrado (ex.: `http://localhost:3000`) e faça login.
*(Na primeira vez o `vercel dev` pede para você logar na Vercel e vincular o projeto.)*

### 6. Subir no GitHub
```bash
git add .
git commit -m "InCiclo com Neon"
gh repo create cicloway-inciclo --private --source=. --push   # ou pelo site
```

### 7. Deploy na Vercel
1. <https://vercel.com/new> → **Import** o repositório.
2. Em **Environment Variables**, adicione **as mesmas** `DATABASE_URL` e `JWT_SECRET` do `.env`.
3. **Deploy**. A Vercel detecta as funções em `/api` automaticamente (sem build de framework).
4. (Opcional) **Settings → Domains** → `intranet.cicloway.com.br`.

---

## Segurança (resumo)
- Senhas: hash **bcrypt** no Neon; a senha em texto nunca é gravada nem enviada ao navegador.
- Sessão: **JWT** assinado (`JWT_SECRET`) em cookie **HttpOnly + SameSite=Lax** (Secure em produção).
- `DATABASE_URL` e `JWT_SECRET` vivem só no servidor (env da Vercel), fora do bundle do frontend.
- Cadastro é **fechado**: só admin cria contas via `npm run criar-usuario`.

## Dúvidas comuns
- **Resetar senha de alguém** → `npm run criar-usuario` com o mesmo e-mail e a nova senha.
- **Desativar acesso** → no Neon (SQL Editor): `update users set ativo=false where email='...';`
- **Tornar admin** → `update users set role='admin' where email='...';`
- **Novas telas / dados editáveis** → criamos novas tabelas no Neon e novas funções em `/api`.
