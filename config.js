/* ═══════════════════════════════════════════════════════════════
   CONFIGURAÇÃO DO SUPABASE — InCiclo (CicloWay)
   ───────────────────────────────────────────────────────────────
   Cole aqui os DOIS valores do seu projeto Supabase:
   Painel Supabase → Project Settings → Data API (e API Keys)

     • Project URL      →  SUPABASE_URL
     • anon / public key →  SUPABASE_ANON_KEY   (começa com "eyJ...")

   ⚠️ Estes valores são PÚBLICOS por design — pode subir no GitHub.
      A segurança de verdade vem das políticas de RLS no banco
      (ver supabase/schema.sql). NUNCA cole aqui a chave "service_role".
   ═══════════════════════════════════════════════════════════════ */

window.SUPABASE_URL      = "COLE_AQUI_SEU_PROJECT_URL";
window.SUPABASE_ANON_KEY = "COLE_AQUI_SUA_ANON_KEY";

// Cria o client global usado pelo app (window.sb).
// Enquanto as chaves não forem preenchidas, deixamos sb = null para a
// tela de login abrir sem quebrar (o app avisa que falta configurar).
window.sb = null;
if (window.SUPABASE_URL && window.SUPABASE_URL.startsWith('http') &&
    window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY.startsWith('ey')) {
  window.sb = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
} else {
  console.warn('[InCiclo] Supabase ainda não configurado — preencha config.js.');
}
