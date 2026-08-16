-- =====================================================================
-- Clutch — 14_badges_v2.sql
-- Catalogue fondateur : métriques publiques + stockage des badges secrets.
--
-- À exécuter APRÈS 13_amis.sql. Rejouable sans effet de bord.
--
-- IMPORTANT : les CONDITIONS des badges secrets ne vivent volontairement PAS
-- dans le dépôt public. Cette migration ne fait que stocker les secrets déjà
-- accordés et les exposer au joueur concerné. Les règles privées seront
-- installées directement côté Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Badges secrets déjà décrochés
-- ---------------------------------------------------------------------
create table if not exists badges_secrets_obtenus (
  user_id   uuid not null references profils(id) on delete cascade,
  cle       text not null check (cle in (
    'sixieme_sens', 'main_froide', 'david', 'contre_le_monde', 'clutch_secret'
  )),
  obtenu_le timestamptz not null default now(),
  primary key (user_id, cle)
);

alter table badges_secrets_obtenus enable row level security;

drop policy if exists badges_secrets_lecture on badges_secrets_obtenus;
create policy badges_secrets_lecture on badges_secrets_obtenus
  for select using (user_id = auth.uid());

-- Aucun INSERT/UPDATE/DELETE n'est accordé au navigateur.
-- Cette fonction est réservée au rôle service_role et sert de point d'entrée
-- au moteur privé de secrets. Elle est idempotente.
create or replace function clutch_accorder_badge_secret(p_user uuid, p_cle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_cle not in ('sixieme_sens', 'main_froide', 'david', 'contre_le_monde', 'clutch_secret') then
    raise exception 'badge secret inconnu';
  end if;

  insert into badges_secrets_obtenus(user_id, cle)
  values (p_user, p_cle)
  on conflict (user_id, cle) do nothing;
end;
$$;

revoke all on function clutch_accorder_badge_secret(uuid, text) from public;
revoke all on function clutch_accorder_badge_secret(uuid, text) from anon;
revoke all on function clutch_accorder_badge_secret(uuid, text) from authenticated;
grant execute on function clutch_accorder_badge_secret(uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- 2. Récapitulatif V2
-- ---------------------------------------------------------------------
-- Les 25 conditions publiques sont calculées dans le navigateur. Ici on ne
-- renvoie que les métriques nécessaires, sur toute la carrière.
create or replace function recap_badges()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with mes_paris as (
    select p.*, m.jeu, m.debut as match_debut
    from paris p
    join matchs m on m.id = p.match_id
    where p.user_id = auth.uid()
      and p.statut in ('gagne', 'perdu')
  ),

  chrono as (
    select mp.*,
           row_number() over (order by cree_le, id)
             - row_number() over (partition by statut order by cree_le, id) as groupe
    from mes_paris mp
  ),

  series_gagnees as (
    select groupe,
           count(*) as longueur
    from chrono
    where statut = 'gagne'
    group by groupe
  ),

  par_jeu as (
    select jeu,
           count(*) as n,
           count(*) filter (where statut = 'gagne') as gagnes,
           round(
             count(*) filter (where statut = 'gagne')::numeric
             / nullif(count(*), 0) * 100,
             1
           ) as precision
    from mes_paris
    where jeu is not null
    group by jeu
  ),

  outsiders_par_semaine as (
    select date_trunc('week', cree_le) as semaine,
           count(*) filter (where statut = 'gagne' and cote >= 2.20) as n
    from mes_paris
    group by date_trunc('week', cree_le)
  ),

  semaine_resultats as (
    select date_trunc('week', cree_le) as semaine,
           count(*) as n,
           bool_and(statut = 'gagne') as parfaite
    from mes_paris
    group by date_trunc('week', cree_le)
  ),

  semaines_actives as (
    select distinct date_trunc('week', cree_le)::date as semaine
    from mes_paris
  ),

  semaines_indexees as (
    select semaine,
           semaine - ((row_number() over (order by semaine))::integer * 7) as ancre
    from semaines_actives
  ),

  series_semaines as (
    select ancre, count(*) as longueur
    from semaines_indexees
    group by ancre
  ),

  mes_ligues as (
    select l.id, l.createur_id,
           (select count(*) from membres_ligue x where x.ligue_id = l.id) as nb_membres
    from ligues l
    join membres_ligue ml on ml.ligue_id = l.id and ml.user_id = auth.uid()
  ),

  classements_ligue as (
    select
      ml.ligue_id,
      pt.saison_id,
      ml.user_id,
      pt.solde,
      count(*) over (partition by ml.ligue_id, pt.saison_id) as nb_membres,
      rank() over (
        partition by ml.ligue_id, pt.saison_id
        order by pt.solde desc, ml.user_id
      ) as rang
    from membres_ligue ml
    join participations pt on pt.user_id = ml.user_id
    join saisons s on s.id = pt.saison_id
    where s.fin < now()
  ),

  mon_classement as (
    select * from classements_ligue where user_id = auth.uid()
  ),

  mon_equipe as (
    select equipe_favorite_id
    from profils
    where id = auth.uid()
  )

  select jsonb_build_object(
    -- Contrat historique conservé.
    'paris',             (select count(*) from mes_paris),
    'gagnes',            (select count(*) from mes_paris where statut = 'gagne'),
    'mises',             (select coalesce(sum(mise), 0) from mes_paris),
    'gains',             (select coalesce(sum(gain), 0) from mes_paris),
    'net',               (select coalesce(sum(gain), 0) - coalesce(sum(mise), 0) from mes_paris),
    'roi',               (select case when coalesce(sum(mise), 0) = 0 then 0
                                      else round((coalesce(sum(gain), 0) - sum(mise))::numeric / sum(mise) * 100, 1) end
                          from mes_paris),
    'precision_pct',     (select case when count(*) = 0 then 0
                                      else round(count(*) filter (where statut = 'gagne')::numeric / count(*) * 100, 1) end
                          from mes_paris),
    'cote_max_gagnee',   (select coalesce(max(cote), 0) from mes_paris where statut = 'gagne'),
    'mise_max_gagnee',   (select coalesce(max(mise), 0) from mes_paris where statut = 'gagne'),
    'scores_exacts',     (select count(*) from mes_paris where statut = 'gagne' and marche = 'score_exact'),
    'total_maps_gagnes', (select count(*) from mes_paris where statut = 'gagne' and marche = 'total_maps'),
    'plus_longue_serie', (select coalesce(max(longueur), 0) from series_gagnees),
    'jours_actifs',      (select count(distinct cree_le::date) from mes_paris),
    'saisons_jouees',    (select count(distinct saison_id) from mes_paris),
    'jeux_joues',        (select count(*) from par_jeu),
    'paris_jeu_max',     (select coalesce(max(n), 0) from par_jeu),
    'calls_gagnes',      (select count(*) from calls where user_id = auth.uid() and statut = 'gagne'),
    'serie_prime_max',   (select coalesce(max(serie), 0) from primes where user_id = auth.uid()),
    'ligues_creees',     (select count(*) from mes_ligues where createur_id = auth.uid()),
    'ligues_rejointes',  (select count(*) from mes_ligues),
    'plus_grande_ligue', (select coalesce(max(nb_membres), 0) from mes_ligues),
    'a_equipe_favorite', (select equipe_favorite_id is not null from mon_equipe),

    -- Nouvelles métriques publiques du catalogue fondateur.
    'outsiders_220_meme_semaine_max',
      (select coalesce(max(n), 0) from outsiders_par_semaine),
    'outsiders_250_gagnes',
      (select count(*) from mes_paris where statut = 'gagne' and cote >= 2.50),
    'meilleure_precision_jeu_30',
      (select coalesce(max(precision), 0) from par_jeu where n >= 30),
    'plus_longue_serie_semaines',
      (select coalesce(max(longueur), 0) from series_semaines),
    'semaine_parfaite',
      exists(select 1 from semaine_resultats where n >= 5 and parfaite),
    'top10_ligue_20',
      exists(select 1 from mon_classement where nb_membres >= 20 and rang <= 10),
    'podium_ligue_10',
      exists(select 1 from mon_classement where nb_membres >= 10 and rang <= 3),
    'roi_ligue_10',
      exists(select 1 from mon_classement where nb_membres >= 10 and rang = 1),
    'a_devance_ami',
      exists(
        select 1
        from mon_classement moi
        join classements_ligue ami
          on ami.ligue_id = moi.ligue_id
         and ami.saison_id = moi.saison_id
         and ami.user_id <> moi.user_id
        join amities am
          on am.statut = 'acceptee'
         and ((am.a = auth.uid() and am.b = ami.user_id)
           or (am.b = auth.uid() and am.a = ami.user_id))
        where moi.solde > ami.solde
      ),
    'communaute_membres',
      (select case
         when equipe_favorite_id is null then 0
         else (select count(*) from profils p2 where p2.equipe_favorite_id = mon_equipe.equipe_favorite_id)
       end
       from mon_equipe),

    -- Le navigateur ne reçoit que les clés déjà décrochées. Les conditions
    -- secrètes ne traversent jamais cette frontière.
    'secrets_obtenus',
      coalesce(
        (select jsonb_agg(cle order by obtenu_le)
         from badges_secrets_obtenus
         where user_id = auth.uid()),
        '[]'::jsonb
      )
  );
$$;

revoke all on function recap_badges() from public;
grant execute on function recap_badges() to authenticated;
