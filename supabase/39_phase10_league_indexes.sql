-- Phase 10 hardening: indexes for league creator/member lookup paths.
create index if not exists ligues_createur_idx on public.ligues(createur_id);
create index if not exists membres_ligue_user_idx on public.membres_ligue(user_id);
