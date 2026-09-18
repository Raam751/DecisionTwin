-- DecisionTwin evidence storage.
--
-- Design note: the browser holds the Supabase anon key, so Row Level Security
-- is mandatory. Readers may select records. Nothing may be written from the
-- browser. Every write goes through an edge function using the service role,
-- which is also where citation verification happens. That separation is the
-- point: the model may propose evidence, but only the server may mark a
-- citation verified.

create table if not exists public.evidence_records (
  id                  text primary key,
  candidate_id        text not null,
  role_id             text not null,
  evidence            jsonb not null default '[]'::jsonb,
  interview_questions jsonb not null default '[]'::jsonb,
  reviewer_edits      jsonb not null default '[]'::jsonb,
  human_decision      jsonb,
  replay_metadata     jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists evidence_records_candidate_role_idx
  on public.evidence_records (candidate_id, role_id);

-- Append-only audit of everything a human changed.
create table if not exists public.reviewer_events (
  id             bigserial primary key,
  record_id      text not null references public.evidence_records (id) on delete cascade,
  event_type     text not null check (event_type in ('override', 'decision')),
  field          text,
  previous_value text,
  new_value      text,
  reason         text not null,
  reviewer       text not null,
  created_at     timestamptz not null default now()
);

create index if not exists reviewer_events_record_idx
  on public.reviewer_events (record_id, created_at);

alter table public.evidence_records enable row level security;
alter table public.reviewer_events  enable row level security;

-- Read-only for the browser.
drop policy if exists evidence_records_read on public.evidence_records;
create policy evidence_records_read
  on public.evidence_records
  for select
  using (true);

drop policy if exists reviewer_events_read on public.reviewer_events;
create policy reviewer_events_read
  on public.reviewer_events
  for select
  using (true);

-- No insert, update, or delete policy exists for anon or authenticated roles.
-- That is deliberate. The service role bypasses RLS, so only edge functions
-- can write. Do not add a permissive write policy to "make it work".

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists evidence_records_touch on public.evidence_records;
create trigger evidence_records_touch
  before update on public.evidence_records
  for each row execute function public.touch_updated_at();
