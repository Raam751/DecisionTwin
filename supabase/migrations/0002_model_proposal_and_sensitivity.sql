-- Adds two diagnostic columns to evidence_records.
--
-- model_proposal        what the model claimed before the server verified it,
--                      so a reviewer can see what verification changed.
-- sensitivity_diagnostic the result of a masked rerun: the same extraction run
--                      against a document with the candidate's name and
--                      pronouns removed, compared per criterion.
--
-- Both are nullable with no default so every existing row stays valid. Neither
-- is written by the browser: only the edge functions, using the service role.
-- No new RLS policy is added here on purpose. The read-only SELECT policies
-- from 0001 already cover these columns.

alter table public.evidence_records
  add column if not exists model_proposal jsonb;

alter table public.evidence_records
  add column if not exists sensitivity_diagnostic jsonb;

comment on column public.evidence_records.model_proposal is
  'Unverified model output captured before server-side citation verification. Never treat as verified evidence.';

comment on column public.evidence_records.sensitivity_diagnostic is
  'Masked rerun comparison. A review trigger only, not a fairness determination.';
