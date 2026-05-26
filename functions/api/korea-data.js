// /api/korea-data — GET and POST the single-row Korea-Days dataset.
//
// Replaces the Node server.js + Railway Postgres backend. The shared
// Supabase project hosts ONE row in `family_korea_data` (id = 1) with
// JSONB columns for trips, overrides, and day_notes — same shape the
// old Railway schema used, so korea-days.html doesn't change.
//
// Why call Supabase's REST API directly (no client lib): Pages Functions
// run on Workers, no node_modules. The PostgREST surface is plenty for
// "load one row, save one row" and avoids the dependency tooling.
//
// Env vars (set on the Cloudflare Pages project):
//   SUPABASE_URL          e.g. https://abcd1234.supabase.co
//   SUPABASE_SERVICE_KEY  service_role key — NEVER exposed to browser;
//                         only this function reads it, and the function
//                         only returns the user's own data.

const TABLE = 'family_korea_data';
const ROW_ID = 1;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function readRow(env) {
  const url = `${env.SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${ROW_ID}&select=trips,overrides,day_notes`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  const row = rows[0] || {};
  return {
    trips:     row.trips     ?? null,
    overrides: row.overrides ?? [],
    day_notes: row.day_notes ?? [],
  };
}

async function writeRow(env, data) {
  // Upsert via PostgREST: `Prefer: resolution=merge-duplicates` makes the
  // POST act as an INSERT-ON-CONFLICT update on the primary key.
  const url = `${env.SUPABASE_URL}/rest/v1/${TABLE}`;
  const payload = {
    id: ROW_ID,
    trips:     data.trips     ?? null,
    overrides: data.overrides ?? [],
    day_notes: data.day_notes ?? [],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Supabase write failed: ${res.status} ${await res.text()}`);
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return jsonResponse({ error: 'Server not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing)' }, 500);
  }

  try {
    if (request.method === 'GET') {
      return jsonResponse(await readRow(env));
    }
    if (request.method === 'POST') {
      const body = await request.json();
      await writeRow(env, body);
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return jsonResponse({ error: String(err.message || err) }, 500);
  }
}
