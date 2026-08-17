-- =====================================================================
-- Clutch — 23_economie_v2_read_compat.sql
-- Compatibilité de lecture pendant le nettoyage frontend.
-- Aucun de ces contrats ne recrée une bankroll.
-- =====================================================================

create or replace function public.etat_prime(p_saison_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$ select null::jsonb $$;
revoke execute on function public.etat_prime(text) from public, anon;
grant execute on function public.etat_prime(text) to authenticated;

create or replace view public.v_mes_paris
with (security_invoker = true)
as
select
  p.id,
  p.user_id,
  p.match_id,
  p.saison_id,
  'vainqueur'::text as marche,
  p.choix,
  'Vainqueur du match'::text as libelle_marche,
  case when p.choix='a' then ea.nom else eb.nom end::text as libelle_choix,
  0::integer as mise,
  1::numeric(6,2) as cote,
  p.statut,
  coalesce(p.delta_frags,0)::integer as gain,
  p.cree_le,
  ea.nom::text as equipe_a,
  eb.nom::text as equipe_b,
  m.jeu::text as jeu,
  m.statut::text as statut_match,
  m.score_a,
  m.score_b,
  m.debut,
  p.delta_frags
from public.pronostics_classes p
join public.matchs m on m.id=p.match_id
join public.equipes ea on ea.id=m.equipe_a_id
join public.equipes eb on eb.id=m.equipe_b_id
where p.user_id=(select auth.uid());

grant select on public.v_mes_paris to authenticated;

create or replace function public.mes_statistiques(p_saison_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select jsonb_build_object(
  'solde',coalesce((select frags from public.classements_frags where user_id=auth.uid() and saison_id=p_saison_id),1000),
  'paris',count(*) filter(where statut in('gagne','perdu')),
  'gagnes',count(*) filter(where statut='gagne'),
  'mises',0,
  'gains',coalesce(sum(delta_frags) filter(where statut in('gagne','perdu')),0),
  'roi',0
)
from public.pronostics_classes
where user_id=auth.uid() and saison_id=p_saison_id;
$$;
revoke execute on function public.mes_statistiques(text) from public, anon;
grant execute on function public.mes_statistiques(text) to authenticated;
