// Gera lib/contract-templates-data.js embutindo cada modelo.docx (base64).
// Rode sempre que criar/editar um modelo em contratos-template/:  npm run build-templates
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import path from 'path';

const DIR = 'contratos-template';
const types = readdirSync(DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .filter(name => { try { return readdirSync(path.join(DIR, name)).includes('modelo.docx'); } catch { return false; } })
  .sort();

let out = '// AUTO-GERADO por scripts/build-templates.mjs — não editar à mão.\n';
out += '// Cada modelo.docx oficial (contratos-template/) embutido em base64 para o runtime da Vercel.\n';
out += 'export const TEMPLATE_DATA = {\n';
for (const t of types) {
  const b64 = readFileSync(path.join(DIR, t, 'modelo.docx')).toString('base64');
  out += `  ${JSON.stringify(t)}: ${JSON.stringify(b64)},\n`;
}
out += '};\n';

writeFileSync(path.join('lib', 'contract-templates-data.js'), out);
console.log(`gerado lib/contract-templates-data.js com ${types.length} modelos:`, types.join(', '));
