/* Optional: your own Storytime relay, as a free Cloudflare Worker.
   Why: Goodreads does not answer requests that come from a web page, so the app asks a relay to fetch the
   public shelf feed for it. The default relay is a shared public service; this one is yours alone.
   It only ever fetches the two sites Storytime uses, and it stores nothing.

   Set-up (about five minutes):
   1. Sign in at dash.cloudflare.com → Workers & Pages → Create → Worker → name it "storytime-relay".
   2. Replace the sample code with this whole file → Deploy.
   3. Copy the worker's address and, in Storytime → Bring in a list → If checks fail, set the relay address to
        https://storytime-relay.YOURNAME.workers.dev/?url=
   4. If you host Storytime somewhere other than isaymotion.github.io, add that address to ALLOWED_ORIGINS. */
const ALLOWED_HOSTS = ['www.goodreads.com', 'thunder.api.overdrive.com'];
const ALLOWED_ORIGINS = ['https://isaymotion.github.io', 'http://localhost:8000'];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0], 'Vary': 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } });
    if (request.method !== 'GET') return new Response('GET only', { status: 405, headers: cors });
    let target;
    try { target = new URL(new URL(request.url).searchParams.get('url')); } catch (e) { return new Response('Missing ?url=', { status: 400, headers: cors }); }
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.includes(target.hostname)) return new Response('Host not allowed', { status: 403, headers: cors });
    const upstream = await fetch(target.toString(), { headers: { 'User-Agent': 'Storytime relay', 'Accept': 'application/json, application/rss+xml, text/xml' }, redirect: 'follow' });
    return new Response(upstream.body, { status: upstream.status, headers: { ...cors, 'Content-Type': upstream.headers.get('Content-Type') || 'text/plain', 'Cache-Control': 'no-store' } });
  }
};
