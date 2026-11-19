// Vercel Edge Function: 許可したゲーム配信元だけを中継する
export const config = { runtime: 'edge' };

// 中継を許可するホスト（それ以外は拒否）
const ALLOWED_HOSTS = ['poki-gdn.com', 'game-cdn.poki.com', 'poki.com', 'amix-design.com'];

function isAllowed(urlStr) {
  let u;
  try { u = new URL(urlStr); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  return ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const target = new URL(req.url).searchParams.get('url');
  if (!target || !isAllowed(target)) {
    return new Response('Forbidden', { status: 403, headers: CORS });
  }

  const upstream = await fetch(target, { redirect: 'follow' });

  const headers = new Headers(CORS);
  const ct = upstream.headers.get('content-type');
  if (ct) headers.set('Content-Type', ct);
  const cc = upstream.headers.get('cache-control');
  if (cc) headers.set('Cache-Control', cc);

  return new Response(upstream.body, { status: upstream.status, headers });
}
