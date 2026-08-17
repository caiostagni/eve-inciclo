import { db, readSessionCookie, verifySession } from '../../lib/auth.js';
import { exchangeCode, setStoredRefresh } from '../../lib/rdstation.js';

function page(title, body, ok) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>`
    + `<body style="font-family:system-ui,-apple-system,sans-serif;background:#0b0e14;color:#e6e9ef;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">`
    + `<div style="max-width:440px;padding:32px;text-align:center">`
    + `<div style="font-size:52px">${ok ? '✅' : '⚠️'}</div>`
    + `<h2 style="color:${ok ? '#91FFB0' : '#ff6b6b'};margin:12px 0">${title}</h2>`
    + `<p style="color:#9aa3b2;line-height:1.55">${body}</p></div>`;
}

// Callback do OAuth do RD Marketing: troca o "code" pelo refresh_token e o guarda no banco.
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const token = readSessionCookie(req);
  let s = null;
  try { if (token) s = await verifySession(token); } catch { s = null; }
  if (!s || s.role !== 'admin') return res.status(403).end(page('Acesso restrito', 'Faça login como administrador na intranet e tente conectar novamente.', false));

  let code = req.query?.code;
  if (!code) { try { code = new URL(req.url, 'http://x').searchParams.get('code'); } catch { code = null; } }
  if (!code) return res.status(400).end(page('Sem código de autorização', 'O RD não retornou o código. Volte ao Dashboard de Vendas e clique em "Conectar RD" de novo.', false));

  const clientId = process.env.RD_MKT_CLIENT_ID, clientSecret = process.env.RD_MKT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(503).end(page('Configuração incompleta', 'Faltam RD_MKT_CLIENT_ID / RD_MKT_CLIENT_SECRET nas variáveis da Vercel.', false));

  try {
    const tok = await exchangeCode({ clientId, clientSecret, code: String(code) });
    await setStoredRefresh(db(), tok.refresh_token);
    return res.status(200).end(page('RD Marketing conectado!', 'Pode fechar esta aba e voltar ao Dashboard de Vendas — clique em "Atualizar agora" para carregar o funil de leads.', true));
  } catch (e) {
    console.error('rd callback error:', e?.status, e?.message, e?.body);
    return res.status(502).end(page('Falha ao conectar', 'Não consegui trocar o código pelo token. Confira o Client Secret e se a Callback URL do App é exatamente <b>/api/rd/callback</b>, e tente novamente.', false));
  }
}
