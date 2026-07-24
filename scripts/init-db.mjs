// Cria as tabelas no Neon rodando db/schema.sql.
// Uso: npm run init-db   (precisa de DATABASE_URL no .env)
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ Defina DATABASE_URL no .env'); process.exit(1); }

const ddl = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(ddl);          // pg executa múltiplos comandos de uma vez
await client.end();

console.log('✅ Banco pronto (tabela `users` criada). Agora: npm run criar-usuario');
