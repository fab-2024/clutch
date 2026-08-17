-- =====================================================================
-- Clutch — 27_secret_badges_v2_and_remove_bet_volts.sql
-- Badges secrets sur pronostics_classes ; suppression définitive du vieux
-- mécanisme Volts <- profit de paris.
-- =====================================================================

-- Aucun Volt ne doit être créé à partir d'un résultat compétitif.
drop trigger if exists volts_sur_pari on public.paris;
drop function if exists public.clutch_volts_sur_pari();

-- L'ancien trigger de secrets sur `paris` n'est plus pertinent.
drop trigger if exists trg_clutch_badges_secrets on public.paris;

create or replace function public.clutch_evaluer_badges_secrets(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if p_user is null then return; end if;

  -- Le Sixième Sens : les 3 derniers pronostics réglés sont gagnants et
  -- chacun portait sur un choix non favori (probabilité modèle <= 50 %).
  select coalesce(bool_and(statut='gagne' and proba_figee<=0.50),false)
    into v_ok
  from (
    select statut,proba_figee
    from public.pronostics_classes
    where user_id=p_user and statut in('gagne','perdu')
    order by cree_le desc,id desc
    limit 3
  ) q
  having count(*)=3;
  if coalesce(v_ok,false) then
    perform public.clutch_accorder_badge_secret(p_user,'sixieme_sens');
  end if;

  -- Main Froide : 3 pronostics gagnants verrouillés dans les 10 dernières
  -- minutes avant le coup d'envoi.
  select count(*)>=3 into v_ok
  from public.pronostics_classes p
  join public.matchs m on m.id=p.match_id
  where p.user_id=p_user
    and p.statut='gagne'
    and p.cree_le>=m.debut-interval '10 minutes'
    and p.cree_le<m.debut;
  if v_ok then
    perform public.clutch_accorder_badge_secret(p_user,'main_froide');
  end if;

  -- David : gagner un choix auquel le modèle donnait 25 % ou moins.
  select exists(
    select 1 from public.pronostics_classes
    where user_id=p_user and statut='gagne' and proba_figee<=0.25
  ) into v_ok;
  if v_ok then
    perform public.clutch_accorder_badge_secret(p_user,'david');
  end if;

  -- Contre le monde : gagner en faisant partie d'une minorité <=10 % sur un
  -- match ayant au moins 10 pronostics classés.
  select exists(
    select 1
    from public.pronostics_classes p
    where p.user_id=p_user
      and p.statut='gagne'
      and (
        select count(*) filter(where x.choix=p.choix)::numeric/nullif(count(*),0)
        from public.pronostics_classes x
        where x.match_id=p.match_id and x.statut<>'annule'
      )<=0.10
      and (
        select count(*)
        from public.pronostics_classes x
        where x.match_id=p.match_id and x.statut<>'annule'
      )>=10
  ) into v_ok;
  if v_ok then
    perform public.clutch_accorder_badge_secret(p_user,'contre_le_monde');
  end if;

  -- CLUTCH. : 5 derniers résultats gagnants, dont au moins un choix à 40 %
  -- ou moins. Le signal combine régularité et audace sans notion de mise.
  with derniers as (
    select statut,proba_figee
    from public.pronostics_classes
    where user_id=p_user and statut in('gagne','perdu')
    order by cree_le desc,id desc
    limit 5
  )
  select count(*)=5
         and bool_and(statut='gagne')
         and min(proba_figee)<=0.40
    into v_ok
  from derniers;
  if coalesce(v_ok,false) then
    perform public.clutch_accorder_badge_secret(p_user,'clutch_secret');
  end if;
end;
$$;

create or replace function public.clutch_badges_secret_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut in('gagne','perdu') and old.statut is distinct from new.statut then
    perform public.clutch_evaluer_badges_secrets(new.user_id);
  end if;
  return new;
end;
$$;

revoke execute on function public.clutch_evaluer_badges_secrets(uuid) from public,anon,authenticated;
revoke execute on function public.clutch_badges_secret_trigger() from public,anon,authenticated;

drop trigger if exists trg_clutch_badges_secrets_v2 on public.pronostics_classes;
create trigger trg_clutch_badges_secrets_v2
after update of statut on public.pronostics_classes
for each row
when (old.statut is distinct from new.statut)
execute function public.clutch_badges_secret_trigger();
