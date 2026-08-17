import { db, readSessionCookie, verifySession } from '../../lib/auth.js';
import { refreshAccessToken, getStoredRefresh, setStoredRefresh, listSegmentations } from '../../lib/rdstation.js';

// Diagnóstico (admin): lista as segmentações da conta do RD Marketing, para mapear as etapas do funil.
export default async function handler(req, res) {
  const token = readSessionCookie(req);
  let s = null;
  try { if (token) s = await verifySession(token); } catch { s = null; }
  if (!s || s.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

  const clientId = process.env.RD_MKT_CLIENT_ID, clientSecret = process.env.RD_MKT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(503).json({ error: 'not_configured' });

  const sql = db();
  const refresh = (await getStoredRefresh(sql)) || process.env.RD_MKT_REFRESH_TOKEN;
  if (!refresh) return res.status(503).json({ error: 'not_connected' });

  try {
    const tok = await refreshAccessToken({ clientId, clientSecret, refreshToken: refresh });
    if (tok.refresh_token && tok.refresh_token !== refresh) await setStoredRefresh(sql, tok.refresh_token);
    const segs = await listSegmentations(tok.access_token);
    return res.status(200).json({ count: segs.length, segmentations: segs.map((x) => ({ id: x.id, name: x.name })) });
  } catch (e) {
    console.error('rd segments error:', e?.status, e?.message, e?.body);
    return res.status(502).json({ error: 'rd_error', detail: e?.body || e?.message });
  }
}
