// Lista os placeholders {{CAMPO}} de um .pptx (útil ao receber um template novo do Canva).
// Uso: node scripts/inspect-pptx.mjs caminho/para/proposta.pptx
import { readFileSync } from 'fs';
import { listPptxPlaceholders } from '../lib/pptx-fill.js';

const path = process.argv[2];
if (!path) { console.error('uso: node scripts/inspect-pptx.mjs <arquivo.pptx>'); process.exit(1); }

const ph = await listPptxPlaceholders(readFileSync(path));
console.log(`Placeholders encontrados (${ph.length}):`);
for (const p of ph) console.log('  {{' + p + '}}');
if (!ph.length) console.log('  (nenhum — confira se os {{CAMPO}} foram digitados como texto editável no Canva)');
