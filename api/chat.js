import Anthropic from '@anthropic-ai/sdk';
import { readSessionCookie, verifySession } from '../lib/auth.js';
import { SYSTEM_PROMPT } from '../lib/knowledge.js';
import { buildTools, runTool } from '../lib/chat-tools.js';

// Assistente InCiclo — só para colaboradores logados. Chama o Claude (Sonnet 5).
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }

  // Auth: só quem está logado usa (evita abuso/custo)
  const token = readSessionCookie(req);
  let session = null;
  try { if (token) session = await verifySession(token); } catch { session = null; }
  if (!session) return res.status(401).json({ error: 'no_session' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'not_configured', reply: 'O assistente ainda não foi configurado (falta a chave da API). Fale com o admin.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let messages = Array.isArray(body.messages) ? body.messages : [];
    // Sanitiza: só user/assistant, texto, limita tamanho e histórico
    messages = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))
      .slice(-12);
    // A API do Claude exige que a conversa comece com 'user' (descarta saudação inicial do bot)
    while (messages.length && messages[0].role === 'assistant') messages.shift();
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user')
      return res.status(400).json({ error: 'bad_request' });

    const client = new Anthropic({ apiKey });
    const tools = buildTools();
    const autor = (session && session.nm) ? String(session.nm) : '';
    const convo = messages.map(m => ({ role: m.role, content: m.content }));
    const files = [];
    let reply = '';

    // Loop de tool use: modelo pergunta os dados, chama a ferramenta, geramos o .docx.
    for (let turn = 0; turn < 4; turn++) {
      const msg = await client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        system: SYSTEM_PROMPT,
        tools,
        messages: convo,
      });

      if (msg.stop_reason === 'tool_use') {
        convo.push({ role: 'assistant', content: msg.content });
        const results = [];
        for (const block of msg.content) {
          if (block.type !== 'tool_use') continue;
          const out = await runTool(block.name, block.input, autor);
          if (out.file) files.push(out.file);
          const txt = out.error
            ? `ERRO: ${out.error}`
            : `${out.resumo}${out.semValor && out.semValor.length ? ' (campos sem valor: ' + out.semValor.join(', ') + ')' : ''}. O arquivo .docx foi entregue ao colaborador com um botão de download — avise que baixe e revise antes de assinar.`;
          results.push({ type: 'tool_result', tool_use_id: block.id, content: txt, is_error: !!out.error });
        }
        convo.push({ role: 'user', content: results });
        continue;
      }

      reply = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      break;
    }

    if (!reply) reply = files.length ? 'Pronto! Gerei o documento — é só baixar. Revise antes de assinar. 📄' : 'Desculpe, não consegui gerar uma resposta agora.';
    return res.status(200).json({ reply, files });
  } catch (e) {
    console.error('chat error:', e?.status, e?.message);
    if (e?.status === 401) return res.status(503).json({ error: 'bad_key', reply: 'A chave da API do assistente parece inválida. Fale com o admin.' });
    if (e?.status === 429) return res.status(429).json({ error: 'rate_limited', reply: 'Muitas mensagens agora. Tente de novo em instantes.' });
    return res.status(500).json({ error: 'server_error', reply: 'Tive um problema para responder. Tente novamente.' });
  }
}
