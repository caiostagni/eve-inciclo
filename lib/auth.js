// ═══════════════════════════════════════════════════════════════
// Núcleo de autenticação — InCiclo (Neon + Vercel Functions)
// Fica FORA de /api de propósito: /api vira rota; /lib é só código.
// ═══════════════════════════════════════════════════════════════
import { neon } from '@neondatabase/serverless';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'inciclo_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

// Cliente Neon (HTTP). DATABASE_URL só existe no servidor, nunca no navegador.
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurada');
  return neon(url);
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('JWT_SECRET ausente ou muito curto');
  return new TextEncoder().encode(s);
}

// Gera o token de sessão assinado (HS256).
export async function signSession(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

// Verifica e devolve o payload; lança se inválido/expirado.
export async function verifySession(token) {
  const { payload } = await jwtVerify(token, secret());
  return payload;
}

// Lê o cookie de sessão a partir do request.
export function readSessionCookie(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

// Monta o header Set-Cookie (httpOnly + SameSite=Lax; Secure fora do localhost).
export function sessionCookie(token, req) {
  const host = req.headers.host || '';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const secure = isLocal ? '' : ' Secure;';
  const maxAge = token ? MAX_AGE : 0;
  const value = token ? encodeURIComponent(token) : '';
  return `${SESSION_COOKIE}=${value}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

// Busca o perfil pelo id e devolve no formato usado pelo frontend.
export async function perfilPorId(sql, id) {
  const rows = await sql`
    select id, email, nome, iniciais, role, dept
    from users where id = ${id} and ativo = true limit 1`;
  const u = rows[0];
  if (!u) return null;
  return {
    id: u.id, email: u.email, nm: u.nome,
    in: u.iniciais || iniciais(u.nome),
    role: u.role || 'employee', dept: u.dept || '—'
  };
}

export function iniciais(nome) {
  if (!nome) return '?';
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
