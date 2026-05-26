-- Shared schema for the "kc-family" Supabase project: backs both
-- Korea-Days-Tracker and Victor-Noah-Financials.
--
-- Both apps use a SINGLE row per table, holding a JSONB blob. This
-- mirrors how the old Railway Postgres versions stored state and
-- means the Cloudflare Pages Function only needs to do
--   upsert id=1 / select where id=1
-- — no joins, no row-level security gymnastics. The service_role key
-- (which only the Pages Function holds) is the gatekeeper.
--
-- IDEMPOTENT — safe to run repeatedly from either repo.

-- ============================================================
-- Korea Days Tracker
-- ============================================================
create table if not exists public.family_korea_data (
  id        integer primary key default 1,
  trips     jsonb,
  overrides jsonb default '[]'::jsonb,
  day_notes jsonb default '[]'::jsonb,
  -- Same constraint the Railway schema had: enforce there's only ever
  -- one row, so SELECT/UPSERT-by-id is bulletproof.
  constraint family_korea_data_singleton check (id = 1)
);
insert into public.family_korea_data (id, trips, overrides, day_notes)
  values (1, null, '[]'::jsonb, '[]'::jsonb)
  on conflict (id) do nothing;

-- ============================================================
-- Victor & Noah Portfolio
-- ============================================================
create table if not exists public.family_portfolio (
  id   integer primary key default 1,
  data jsonb not null,
  constraint family_portfolio_singleton check (id = 1)
);
insert into public.family_portfolio (id, data)
  values (1, '{
    "victor": { "shares": null, "cash": 0, "ledger": [] },
    "noah":   { "shares": null, "cash": 0, "ledger": [] },
    "tasks": [],
    "completions": [],
    "momPin": "1234"
  }'::jsonb)
  on conflict (id) do nothing;

-- ============================================================
-- Row-level security
-- ============================================================
-- RLS is enabled so anon/authenticated clients can't read either
-- table directly. Only the service_role bypasses RLS — and that key
-- is only ever read by the Cloudflare Pages Functions (set as an
-- env var on the Pages project), never shipped to the browser.
alter table public.family_korea_data enable row level security;
alter table public.family_portfolio  enable row level security;

-- No policies = no access for anon/authenticated. service_role is
-- exempt from RLS by definition, so the Pages Functions still work.

comment on table public.family_korea_data is
  'Korea-Days-Tracker singleton row. Read/written by Cloudflare Pages Function functions/api/korea-data.js via service_role key.';
comment on table public.family_portfolio is
  'Victor & Noah portfolio singleton row. Read/written by Cloudflare Pages Function functions/api/data.js via service_role key.';
