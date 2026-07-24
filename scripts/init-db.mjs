// Cria as tabelas no Neon rodando db/schema.sql.
// Uso: npm run init-db   (precisa de DATABASE_URL no .env)
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ Defina DATABASE_URL no .env'); process.exit(1); }

const sql = neon(url);
const ddl = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');

// Executa cada comando separado por ";" (schema simples, sem funções).
const stmts = ddl.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
for (const s of stmts) {
  await sql.query(s);
  console.log('✓', s.split('\n')[0].slice(0, 60));
}
console.log('\n✅ Banco pronto. Agora crie usuários com: npm run criar-usuario');
