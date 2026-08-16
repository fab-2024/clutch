-- =====================================================================
--  Clutch — 14_correctif_volts.sql
--  Une fuite dans clutch_solde_volts, et sa fermeture.
--
--  À exécuter après 13_amis.sql. Rejouable.
-- =====================================================================
--
--  LE DÉFAUT
--
--  clutch_solde_volts(p_user uuid default auth.uid()) est SECURITY
--  DEFINER : elle s'exécute avec les droits du propriétaire et contourne
--  donc la RLS. Le paramètre étant libre, n'importe quel joueur pouvait
--  appeler clutch_solde_volts('<uuid d'un autre>') et lire son solde.
--
--  C'est exactement ce que la policy de volts_mouvements interdit — elle
--  limite la lecture à user_id = auth.uid(). La fonction disait le
--  contraire de la policy, et c'est la fonction qui gagnait.
--
--  La leçon, à appliquer à toute fonction SECURITY DEFINER future :
--  un paramètre d'identité dans une fonction qui contourne la RLS est
--  une fuite tant qu'il n'est pas contrôlé. Soit on le retire, soit on
--  vérifie qui appelle.
--
--  Ici on vérifie : chacun lit le sien, un administrateur lit celui de
--  tout le monde — il en a besoin pour le support.
-- =====================================================================

create or replace function clutch_solde_volts(p_user uuid default auth.uid())
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if p_user <> auth.uid() and not clutch_est_admin() then
    raise exception 'on ne lit que son propre solde' using errcode = '42501';
  end if;

  return (
    select coalesce(sum(montant), 0)::integer
    from volts_mouvements
    where user_id = p_user
  );
end;
$$;

-- Même raisonnement pour le détail par robinet.
create or replace function clutch_volts_detail(p_user uuid default auth.uid())
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if p_user <> auth.uid() and not clutch_est_admin() then
    raise exception 'on ne lit que son propre detail' using errcode = '42501';
  end if;

  return json_build_object(
    'solde', clutch_solde_volts(p_user),
    'par_origine', coalesce((
      select json_object_agg(origine, total)
      from (
        select origine, sum(montant)::integer as total
        from volts_mouvements
        where user_id = p_user
        group by origine
      ) x
    ), '{}'::json)
  );
end;
$$;
