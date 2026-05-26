// Cloudflare Pages middleware — basic-auth gate on every request.
//
// Mirrors KC-Financials/functions/_middleware.js. Reads AUTH_USERS env
// var as "user1:pass1,user2:pass2"; if unset, requests pass through
// (local-preview convenience).

function parseAuthUsers(raw) {
  const map = {};
  if (!raw) return map;
  for (const entry of raw.split(',')) {
    const idx = entry.indexOf(':');
    if (idx < 1) continue;
    const u = entry.slice(0, idx).trim();
    const p = entry.slice(idx + 1).trim();
    if (u && p) map[u] = p;
  }
  return map;
}

function decodeBasicAuth(headerValue) {
  if (!headerValue || !headerValue.startsWith('Basic ')) return null;
  try {
    const decoded = atob(headerValue.slice(6));
    const idx = decoded.indexOf(':');
    if (idx < 1) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch (_) {
    return null;
  }
}

export async function onRequest(context) {
  const users = parseAuthUsers(context.env?.AUTH_USERS || '');
  if (Object.keys(users).length === 0) {
    return context.next();
  }
  const creds = decodeBasicAuth(context.request.headers.get('authorization'));
  if (creds && users[creds.user] === creds.pass) {
    return context.next();
  }
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Korea Days Tracker"',
      'Content-Type': 'text/plain',
    },
  });
}
