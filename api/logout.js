import { sessionCookie } from '../lib/auth.js';

// Encerra a sessão limpando o cookie httpOnly.
export default async function handler(req, res) {
  res.setHeader('Set-Cookie', sessionCookie('', req));
  return res.status(200).json({ ok: true });
}
