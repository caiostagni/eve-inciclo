// Preenche uma apresentação .pptx (PowerPoint) substituindo {{CAMPO}} nos slides.
// Mesma ideia do contract-fill (docx), adaptada ao DrawingML: o texto fica em <a:t>…</a:t>
// dentro de <a:r> (runs), agrupados por parágrafo <a:p>. O Canva costuma QUEBRAR um
// placeholder entre vários <a:t>, então tratamos por parágrafo: se o {{}} está partido,
// consolidamos o texto no primeiro run; senão, substituímos run a run (preserva formatação).
import JSZip from 'jszip';

const PH = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const xesc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function autoDate() {
  const d = new Date();
  const sem = `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  return { DATA_HOJE: `São Paulo, ${sem}`, DATA_HOJE_SEM_CIDADE: sem, DATA: sem };
}

// Substitui os placeholders dentro de um parágrafo <a:p>…</a:p>.
function fillParagraph(para, values, missing) {
  const tRe = /(<a:t(?:\s[^>]*)?>)([\s\S]*?)(<\/a:t>)/g;
  const runs = [];
  let m;
  while ((m = tRe.exec(para))) runs.push({ open: m[1], text: m[2], close: m[3], index: m.index, len: m[0].length });
  if (!runs.length) return para;

  const full = runs.map((r) => r.text).join('');
  if (full.indexOf('{{') === -1) return para;

  const repl = (s) => s.replace(PH, (mm, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) return xesc(values[key] ?? '');
    missing.add(key);
    return mm;
  });

  // algum placeholder está partido entre runs?
  let pos = 0; const spans = [];
  for (const r of runs) { spans.push([pos, pos + r.text.length]); pos += r.text.length; }
  let split = false;
  for (const mm of full.matchAll(PH)) {
    const ini = mm.index, fim = mm.index + mm[0].length;
    if (!spans.some(([s, e]) => s <= ini && fim <= e)) { split = true; break; }
  }

  const newTexts = split
    ? runs.map((r, i) => (i === 0 ? repl(full) : ''))   // consolida no 1º run
    : runs.map((r) => repl(r.text));                    // run a run (preserva formatação)

  let out = '', last = 0;
  runs.forEach((r, i) => { out += para.slice(last, r.index) + r.open + newTexts[i] + r.close; last = r.index + r.len; });
  out += para.slice(last);
  return out;
}

function fillXml(xml, values, missing) {
  return xml.replace(/<a:p(?:\s[^>]*)?>[\s\S]*?<\/a:p>/g, (p) => fillParagraph(p, values, missing));
}

const isSlide = (name) => /ppt\/slides\/slide\d+\.xml$/.test(name);

// Preenche o .pptx. Retorna { buf, missing:[...] }.
export async function fillPptx(templateBuffer, values = {}) {
  const zip = await JSZip.loadAsync(templateBuffer);
  const all = { ...autoDate(), ...values };
  const missing = new Set();
  for (const name of Object.keys(zip.files)) {
    if (!isSlide(name)) continue;
    let xml = await zip.files[name].async('string');
    xml = fillXml(xml, all, missing);
    zip.file(name, xml);
  }
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { buf, missing: [...missing] };
}

// Lista todos os {{CAMPO}} presentes nos slides (útil ao receber um template novo:
// mostra o que preencher e ajuda a detectar placeholders quebrados/ausentes).
export async function listPptxPlaceholders(templateBuffer) {
  const zip = await JSZip.loadAsync(templateBuffer);
  const set = new Set();
  for (const name of Object.keys(zip.files)) {
    if (!isSlide(name)) continue;
    const xml = await zip.files[name].async('string');
    const txt = xml.replace(/<[^>]+>/g, ''); // pega inclusive placeholders partidos entre runs
    for (const m of txt.matchAll(PH)) set.add(m[1]);
  }
  return [...set].sort();
}
