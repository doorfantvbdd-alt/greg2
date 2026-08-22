// middleware.js — Vercel Routing Middleware, runs on the Edge before
// any request reaches the static files. This is the real gate: it
// only lets a request through to the actual site if a valid
// `ek_access` cookie is present. Everything else gets a bare 404 —
// "nothing," as requested — including the bare domain, search-engine
// crawlers, and anyone who doesn't have the card.
//
// The cookie is minted by /api/enter (see api/enter.js), which is
// exactly what the QR code on the physical card points to.

import { rewrite, next } from '@vercel/functions';

const COOKIE_NAME = 'ek_access';

function hasValidSession(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(COOKIE_NAME + '='));
  if (!match) return false;

  const value = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  const expiry = parseInt(value, 10);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export default function middleware(request) {
  const url = new URL(request.url);

  // /api/enter has to run without being gated by itself — it's the
  // thing that ISSUES the cookie in the first place.
  if (url.pathname.startsWith('/api/enter')) {
    return next();
  }

  if (!hasValidSession(request)) {
    // No valid session: bare 404, nothing rendered, nothing to find.
    return new Response(null, { status: 404 });
  }

  // Valid session: whatever unique-looking path the visitor landed
  // on (e.g. /id934y88crbb4c), quietly serve the real page there.
  return rewrite(new URL('/index.html', request.url));
}

// Runs on every path EXCEPT: the /api/enter minting endpoint itself,
// static assets under /ekitten_assets, and common asset file
// extensions — those are served directly so images etc. keep working
// once the real page is rewritten in.
export const config = {
  matcher: [
    '/((?!api/enter|ekitten_assets/|favicon\\.ico|.*\\.(?:jpg|jpeg|png|gif|svg|webp|css|js|ico)$).*)',
  ],
};
