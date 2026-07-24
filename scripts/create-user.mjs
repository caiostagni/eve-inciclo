// Cria (ou atualiza) um colaborador no Neon, com senha em bcrypt.
// Uso interativo:  npm run criar-usuario
// Uso direto:      node scripts/create-user.mjs email senha "Nome Completo" role "Departamento"
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ Defina DATABASE_URL no .env'); process.exit(1); }
const sql = neon(url);

function iniciais(nome) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

async function coletar() {
  const a = process.argv.slice(2);
  if (a.length >= 4) {
    return { email: a[0], senha: a[1], nome: a[2], role: a[3] || 'employee', dept: a[4] || '' };
  }
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const email = (await rl.question('E-mail: ')).trim().toLowerCase();
  const senha = (await rl.question('Senha inicial: ')).trim();
  const nome  = (await rl.question('Nome completo: ')).trim();
  const role  = ((await rl.question('Papel [admin/employee] (employee): ')).trim() || 'employee');
  const dept  = (await rl.question('Departamento: ')).trim();
  rl.close();
  return { email, senha, nome, role, dept };
}

const { email, senha, nome, role, dept } = await coletar();
if (!email || !senha || !nome) { console.error('❌ email, senha e nome são obrigatórios'); process.exit(1); }
if (!['admin', 'employee'].includes(role)) { console.error('❌ role deve ser admin ou employee'); process.exit(1); }

const hash = await bcrypt.hash(senha, 10);
const ini = iniciais(nome);

await sql`
  insert into users (email, password_hash, nome, iniciais, role, dept)
  values (${email}, ${hash}, ${nome}, ${ini}, ${role}, ${dept || null})
  on conflict (email) do update set
    password_hash = excluded.password_hash,
    nome = excluded.nome,
    iniciais = excluded.iniciais,
    role = excluded.role,
    dept = excluded.dept,
    ativo = true`;

console.log(`\n✅ ${nome} <${email}> — ${role}${dept ? ' · ' + dept : ''} (iniciais ${ini})`);
console.log('   Senha definida. Peça para trocar no primeiro acesso.');
