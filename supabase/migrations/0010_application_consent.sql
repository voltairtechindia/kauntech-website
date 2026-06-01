-- Persist proof of DPDP consent per application.
-- The /career form already *requires* the consent checkbox (and the API rejects
-- submissions without it), but the value was never stored. To make consent
-- demonstrable (which is what the DPDP Act actually cares about), record both
-- that consent was given and when.
alter table public.job_applications
  add column if not exists consent_given boolean     not null default false,
  add column if not exists consent_at    timestamptz;
