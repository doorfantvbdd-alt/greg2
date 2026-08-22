// api/enter.js — this is the URL your card's QR code should point to,
// e.g. https://your-project.vercel.app/api/enter
//
// Every scan:
//   1. mints a random-looking path id (cosmetic — just makes the URL
//      bar show something like /id934y88crbb4c instead of the root)
//   2. sets a session cookie good for 20 minutes
//   3. redirects the visitor to that random path, where
//      middleware.js will see the fresh cookie and quietly serve the
//      real site

export const config = { runtime: 'edge' };

const COOKIE_NAME = 'ek_access';
const SESSION_MINUTES = 20;

function randomId(len = 14) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export default function handler(request) {
  const url = new URL(request.url);
  const id = randomId();
  const maxAgeSeconds = SESSION_MINUTES * 60;
  const expiresAt = Date.now() + maxAgeSeconds * 1000;

  const headers = new Headers();
  headers.set('Location', `${url.origin}/${id}`);
  // Not HttpOnly on purpose: the page reads this value client-side
  // to drive its own countdown display. The value is just a
  // timestamp — nothing sensitive — so this is a fine trade-off.
  headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${expiresAt}; Max-Age=${maxAgeSeconds}; Path=/; Secure; SameSite=Lax`
  );

  return new Response(null, { status: 302, headers });
}
