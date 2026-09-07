-- Time alone never establishes a live or final result. Keep unresolved old
-- fixtures out of discovery, without deleting calls or fabricating scores.
create or replace view public.v_matchs_selectionnes with (security_invoker = true) as
select m.*
from public.v_matchs m
where m.jeu in ('lol','valorant','rocket_league')
  and (
    (m.statut = 'a_venir' and m.debut > now())
    or (m.statut = 'en_cours' and m.debut between now() - interval '24 hours' and now())
    or m.statut in ('termine','annule')
  )
  and exists (
    select 1 from public.match_team_selection s
    where m.equipe_a_id = any(s.provider_team_ids)
      or m.equipe_b_id = any(s.provider_team_ids)
      or lower(btrim(m.equipe_a)) = any(s.aliases)
      or lower(btrim(m.equipe_b)) = any(s.aliases)
  );
revoke all on public.v_matchs_selectionnes from public, anon, authenticated;
grant select on public.v_matchs_selectionnes to anon, authenticated, service_role;
comment on view public.v_matchs_selectionnes is
  'Selected organizations; only future scheduled fixtures, explicit live series within 24h, and terminal results. Unresolved history stays in v_matchs for reconciliation and existing calls.';
notify pgrst, 'reload schema';
