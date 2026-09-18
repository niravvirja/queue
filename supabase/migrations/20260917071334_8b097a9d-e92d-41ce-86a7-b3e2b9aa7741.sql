ALTER TABLE public.statuses
  ADD COLUMN IF NOT EXISTS media_path text,
  ADD COLUMN IF NOT EXISTS media_mime text,
  ADD COLUMN IF NOT EXISTS media_kind text;

ALTER TABLE public.statuses ALTER COLUMN note SET DEFAULT '';