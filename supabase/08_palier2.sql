-- =====================================================================
--  Clutch — palier 2 : classement enrichi, badges, cartes.
--
--  À exécuter APRÈS 01 à 07. Idempotent.
--
--  Il apporte deux choses seulement, et c'est volontaire :
--    1. la note à vie (une colonne, mise à jour au règlement)
--    2. le récapitulatif qui alimente les badges
--
--  Les VINGT ET UNE RÈGLES de badges ne sont PAS ici : elles vivent dans
--  web/js/core.js et nulle part ailleurs. Les réécrire en PL/pgSQL aurait
--  créé deux vérités qui auraient divergé dès le premier badge ajouté. Un
--  badge n'est ni de l'argent ni un droit — rien n'oblige à le calculer côté
--  serveur. Le solde, lui, reste calculé ici et seulement ici.
-- =====================================================================

-- =====================================================================
--  1. La note à vie
-- =====================================================================

alter table profils add column if not exists note integer not null default 1000;
alter table profils add column if not exists note_paris integer not null default 0;

create or replace function clutch_note_initiale() returns integer language sql immutable as $$ select 1000 $$;
create or replace function clutch_note_k()        returns integer language sql immutable as $$ select 16 $$;

/*
 * Probabilité réelle derrière une cote, marge retirée.
 *
 * La cote servie intègre 6 % de marge : sa probabilité implicite est
 * surestimée. Noter les joueurs dessus les ferait tous dériver vers le bas,
 * y compris un joueur parfait — la note mesurerait la marge, pas le jugement.
 */
create or replace function clutch_proba_sans_marge(p_cote numeric)
returns numeric language sql immutable as $$
  select least(1, greatest(0, 1.0 / (p_cote * (1 + clutch_marge()))));
$$;

/*
 * Nouvelle note après un pari réglé : un Elo joué contre le marché.
 * La mise n'entre pas dans le calcul — la note mesure la justesse, pas le
 * courage ni le volume. Le classement au solde s'occupe déjà de ça.
 */
create or replace function clutch_maj_note(p_note integer, p_cote numeric, p_gagnant boolean)
returns integer language sql immutable as $$
  select round(
    coalesce(p_note, clutch_note_initiale())
    + clutch_note_k() * ((case when p_gagnant then 1 else 0 end) - clutch_proba_sans_marge(p_cote))
  )::integer;
$$;

-- =====================================================================
--  2. Règlement d'un match : on y ajoute la note
-- =====================================================================
create or replace function regler_match(p_match_id text, p_score_a integer, p_score_b integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m         record;
  attendu   integer;
  v_regles  integer := 0;
  v_autos   integer := 0;
  pa        numeric;
  reel_a    numeric;
  delta     numeric;
  ea        record;
  eb        record;
  pari      record;
  joueur    record;
  gagnant   boolean;
begin
  if not exists (select 1 from profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.';
  end if;

  select * into m from matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut = 'termine' then raise exception 'Match déjà réglé.'; end if;

  attendu := ceil(m.format / 2.0);
  if greatest(p_score_a, p_score_b) <> attendu or p_score_a = p_score_b then
    raise exception 'Score impossible pour un BO% : le vainqueur doit avoir % maps.', m.format, attendu;
  end if;

  -- Paris automatiques des joueurs qui n'ont rien saisi (anti-décrochage).
  for joueur in select id from profils where coalesce(pari_auto_mode, 'off') <> 'off' loop
    v_autos := v_autos + clutch_pari_auto(joueur.id, p_match_id);
  end loop;

  select * into ea from equipes where id = m.equipe_a_id for update;
  select * into eb from equipes where id = m.equipe_b_id for update;

  update matchs
     set score_a = p_score_a, score_b = p_score_b, statut = 'termine',
         elo_a_fige = ea.elo, elo_b_fige = eb.elo
   where id = p_match_id;

  for pari in select * from paris where match_id = p_match_id and statut = 'en_cours' loop
    gagnant := case pari.marche
      when 'vainqueur'   then (case when pari.choix = 'a' then p_score_a > p_score_b else p_score_b > p_score_a end)
      when 'score_exact' then pari.choix = p_score_a || '-' || p_score_b
      when 'total_maps'  then (case when pari.choix = 'under'
                                    then p_score_a + p_score_b <= greatest(p_score_a, p_score_b)
                                    else p_score_a + p_score_b >  greatest(p_score_a, p_score_b) end)
      else false
    end;

    update paris
       set statut = case when gagnant then 'gagne' else 'perdu' end,
           gain   = case when gagnant then round(pari.mise * pari.cote) else 0 end
     where id = pari.id;

    if gagnant then
      update participations
         set solde = solde + round(pari.mise * pari.cote)
       where user_id = pari.user_id and saison_id = pari.saison_id;
    end if;

    -- La note à vie suit chaque pari réglé, toutes saisons confondues.
    update profils
       set note = clutch_maj_note(note, pari.cote, gagnant),
           note_paris = note_paris + 1
     where id = pari.user_id;

    v_regles := v_regles + 1;
  end loop;

  pa := clutch_proba_map(ea.elo, eb.elo);
  reel_a := p_score_a::numeric / (p_score_a + p_score_b);
  delta := clutch_elo_k() * (reel_a - pa);

  update equipes set elo = round(ea.elo + delta) where id = ea.id;
  update equipes set elo = round(eb.elo - delta) where id = eb.id;

  return jsonb_build_object(
    'regles', v_regles, 'autos', v_autos,
    'elo_a', (select elo from equipes where id = ea.id),
    'elo_b', (select elo from equipes where id = eb.id)
  );
end;
$$;

-- =====================================================================
--  3. Classements : la note et le retour sur mise s'ajoutent au solde
-- =====================================================================
drop function if exists classement_ligue(uuid, text);
drop function if exists classement_global(text);
drop function if exists clutch_classement(uuid[], text) cascade;

create or replace function clutch_classement(p_ids uuid[], p_saison_id text)
returns table (
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text,
  mises bigint, gains bigint, roi numeric, note integer, note_paris integer
)
language sql stable as $$
  select
    pr.id,
    pr.pseudo,
    coalesce(pt.solde, (select solde_initial from saisons where id = p_saison_id)) as solde,
    count(pa.id) filter (where pa.statut in ('gagne', 'perdu'))    as paris,
    count(pa.id) filter (where pa.statut = 'gagne')                as gagnes,
    pr.id = auth.uid()                                             as moi,
    ef.tag                                                         as tag_favori,
    ef.nom                                                         as equipe_favorite,
    coalesce(sum(pa.mise) filter (where pa.statut in ('gagne', 'perdu')), 0) as mises,
    coalesce(sum(pa.gain), 0)                                      as gains,
    case
      when coalesce(sum(pa.mise) filter (where pa.statut in ('gagne', 'perdu')), 0) = 0 then 0
      else round(
        (coalesce(sum(pa.gain), 0) - sum(pa.mise) filter (where pa.statut in ('gagne', 'perdu')))::numeric
        / sum(pa.mise) filter (where pa.statut in ('gagne', 'perdu')) * 100, 1)
    end                                                            as roi,
    pr.note,
    pr.note_paris
  from profils pr
  left join participations pt on pt.user_id = pr.id and pt.saison_id = p_saison_id
  left join paris pa on pa.user_id = pr.id and pa.saison_id = p_saison_id
  left join equipes ef on ef.id = pr.equipe_favorite_id
  where pr.id = any (p_ids)
  group by pr.id, pr.pseudo, pt.solde, ef.tag, ef.nom, pr.note, pr.note_paris
  order by solde desc, gagnes desc;
$$;

create or replace function classement_ligue(p_ligue_id uuid, p_saison_id text)
returns table (
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text,
  mises bigint, gains bigint, roi numeric, note integer, note_paris integer
)
language sql stable as $$
  select * from clutch_classement(
    array(select user_id from membres_ligue where ligue_id = p_ligue_id), p_saison_id
  );
$$;

create or replace function classement_global(p_saison_id text)
returns table (
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text,
  mises bigint, gains bigint, roi numeric, note integer, note_paris integer
)
language sql stable as $$
  select * from clutch_classement(
    array(select user_id from participations where saison_id = p_saison_id order by solde desc limit 100),
    p_saison_id
  );
$$;

create or replace function palmares()
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x order by x -> 'saison' ->> 'fin' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'saison', to_jsonb(s),
      'vainqueur', (
        select to_jsonb(c) from clutch_classement(
          array(select user_id from participations where saison_id = s.id), s.id
        ) c limit 1
      )
    ) as x
    from v_saisons s
    where s.statut = 'terminee'
  ) t;
$$;

-- =====================================================================
--  4. Le récapitulatif qui alimente les badges
-- =====================================================================
/*
 * Une seule requête, sur TOUTE la carrière du joueur — pas sur la saison
 * courante : un badge qui disparaîtrait au changement de saison n'aurait
 * aucun sens.
 *
 * Les noms de champs sont exactement ceux qu'attend recapPourBadges() en
 * JavaScript. C'est le contrat entre les deux moitiés.
 */
create or replace function recap_badges()
returns jsonb language sql stable security definer set search_path = public as $$
  with mes_paris as (
    select p.*, m.jeu
    from paris p join matchs m on m.id = p.match_id
    where p.user_id = auth.uid() and p.statut in ('gagne', 'perdu')
  ),
  -- Plus longue série de paris gagnants d'affilée, en ordre chronologique.
  chrono as (
    select statut, cree_le,
           row_number() over (order by cree_le)
             - row_number() over (partition by statut order by cree_le) as groupe
    from mes_paris
  ),
  series as (
    select count(*) as longueur from chrono where statut = 'gagne' group by groupe
  ),
  par_jeu as (
    select jeu, count(*) as n from mes_paris where jeu is not null group by jeu
  ),
  mes_ligues as (
    select l.id, l.createur_id,
           (select count(*) from membres_ligue x where x.ligue_id = l.id) as nb_membres
    from ligues l
    join membres_ligue ml on ml.ligue_id = l.id and ml.user_id = auth.uid()
  )
  select jsonb_build_object(
    'paris',            (select count(*) from mes_paris),
    'gagnes',           (select count(*) from mes_paris where statut = 'gagne'),
    'mises',            (select coalesce(sum(mise), 0) from mes_paris),
    'gains',            (select coalesce(sum(gain), 0) from mes_paris),
    'net',              (select coalesce(sum(gain), 0) - coalesce(sum(mise), 0) from mes_paris),
    'roi',              (select case when coalesce(sum(mise), 0) = 0 then 0
                                     else round((coalesce(sum(gain), 0) - sum(mise))::numeric / sum(mise) * 100, 1) end
                         from mes_paris),
    'cote_max_gagnee',  (select coalesce(max(cote), 0) from mes_paris where statut = 'gagne'),
    'mise_max_gagnee',  (select coalesce(max(mise), 0) from mes_paris where statut = 'gagne'),
    'scores_exacts',    (select count(*) from mes_paris where statut = 'gagne' and marche = 'score_exact'),
    'total_maps_gagnes',(select count(*) from mes_paris where statut = 'gagne' and marche = 'total_maps'),
    'plus_longue_serie',(select coalesce(max(longueur), 0) from series),
    'jours_actifs',     (select count(distinct cree_le::date) from mes_paris),
    'saisons_jouees',   (select count(distinct saison_id) from mes_paris),
    'jeux_joues',       (select count(*) from par_jeu),
    'paris_jeu_max',    (select coalesce(max(n), 0) from par_jeu),
    'calls_gagnes',     (select count(*) from calls where user_id = auth.uid() and statut = 'gagne'),
    'serie_prime_max',  (select coalesce(max(serie), 0) from primes where user_id = auth.uid()),
    'ligues_creees',    (select count(*) from mes_ligues where createur_id = auth.uid()),
    'plus_grande_ligue',(select coalesce(max(nb_membres), 0) from mes_ligues),
    'a_equipe_favorite',(select equipe_favorite_id is not null from profils where id = auth.uid())
  );
$$;

-- =====================================================================
--  Droits
-- =====================================================================
revoke all on function recap_badges() from public;
grant execute on function recap_badges()                to authenticated;
grant execute on function classement_ligue(uuid, text)  to authenticated;
grant execute on function classement_global(text)       to anon, authenticated;
grant execute on function palmares()                    to anon, authenticated;
grant execute on function regler_match(text, integer, integer) to authenticated;
