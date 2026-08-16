-- =====================================================================
--  Clutch — 12_volts_paris.sql
--  Les Volts au fil des paris : un Frag de bénéfice = un Volt.
--
--  À exécuter après 11_volts.sql. Rejouable sans effet de bord.
--
--  Décision du 16 août. Elle rend facultatif le robinet à badges du §3 de
--  double-monnaie-frags-volts.md : plus besoin de réécrire les 21 règles
--  de badges en SQL pour ouvrir la boutique.
--
-- ---------------------------------------------------------------------
--  POURQUOI UN SOMMET, ET PAS UN CRÉDIT PAR PARI
--
--  Créditer le bénéfice de chaque pari gagné semble équivalent, et ne
--  l'est pas : les pertes ne se soustraient jamais. Un joueur qui pose
--  mille paris à pile ou face en gagne cinq cents, encaisse cinq cents
--  bénéfices — et repart à l'équilibre en Frags avec une fortune en
--  Volts. C'est exactement le « 500 paris médiocres » que les badges
--  refusent depuis le premier jour, réintroduit par la petite porte.
--
--  On crédite donc sur le SOMMET du bénéfice net de la saison : le
--  cumul de (gains - mises) sur les paris réglés, et on paie chaque fois
--  qu'il dépasse son propre record.
--
--    · volume-neutre : un joueur à l'équilibre ne dépasse jamais
--      durablement son record, il ne gagne quasiment rien ;
--    · continu : chaque nouveau record paie immédiatement, il n'y a pas
--      à attendre la fin de saison pour voir bouger le compteur ;
--    · jamais punitif : le sommet ne redescend pas. Une mauvaise série
--      ne retire aucun Volt déjà gagné, elle repousse seulement le
--      prochain versement.
--
--  L'assiette reste le bénéfice net, jamais le gain brut : miser 100 et
--  récupérer 200, c'est 100 Volts, pas 200.
-- =====================================================================

-- 'pari' rejoint les origines autorisées du grand livre.
alter table volts_mouvements drop constraint if exists volts_mouvements_origine_check;
alter table volts_mouvements add constraint volts_mouvements_origine_check
  check (origine in ('badge', 'saison', 'call', 'achat', 'ajustement', 'pari'));

-- ------------------------------------------------------------ Le sommet
-- Un record par joueur et par saison. Il ne descend jamais.
create table if not exists volts_sommet (
  saison_id text not null references saisons (id) on delete cascade,
  user_id   uuid not null references profils (id) on delete cascade,
  sommet    integer not null default 0 check (sommet >= 0),
  maj_le    timestamptz not null default now(),
  primary key (saison_id, user_id)
);

-- --------------------------------------------------------- Le déclencheur
-- Posé sur `paris` plutôt que dans regler_match : le règlement passe par
-- plusieurs chemins (match réglé, événement réglé, rattrapage des paris
-- automatiques) et un déclencheur les couvre tous sans les modifier. Un
-- chemin ajouté demain sera couvert sans qu'on y pense.
--
-- Il ne lit que `paris` : le bonus de connexion quotidien gonfle le solde
-- de Frags sans être un mérite de pronostic, et n'a donc rien à faire
-- dans une assiette à Volts. Passer par le solde l'aurait inclus.
--
-- Choix assumé : AUCUNE reprise. Si un match réglé est ensuite annulé, le
-- sommet ne redescend pas et les Volts restent acquis. Les reprendre
-- pourrait rendre un solde négatif si le joueur a déjà dépensé — et il
-- s'agit de cosmétique, pas de bankroll. Les Frags, eux, sont bien
-- remboursés par annuler_match : c'est là que ça compte.
create or replace function clutch_volts_sur_pari()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_net    integer;
  v_sommet integer;
begin
  if new.statut not in ('gagne', 'perdu') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.statut = new.statut then
    return new;
  end if;

  -- Deux règlements simultanés du même joueur se sérialisent, sinon les
  -- deux liraient le même sommet et paieraient chacun l'écart complet.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || new.saison_id, 0));

  select coalesce(sum(gain), 0) - coalesce(sum(mise), 0)
    into v_net
  from paris
  where user_id = new.user_id
    and saison_id = new.saison_id
    and statut in ('gagne', 'perdu');

  insert into volts_sommet (saison_id, user_id, sommet)
  values (new.saison_id, new.user_id, 0)
  on conflict (saison_id, user_id) do nothing;

  select sommet into v_sommet
  from volts_sommet
  where saison_id = new.saison_id and user_id = new.user_id
  for update;

  if v_net > v_sommet then
    insert into volts_mouvements (user_id, montant, origine, reference)
    values (new.user_id, v_net - v_sommet, 'pari', new.id::text)
    on conflict (user_id, origine, reference) do nothing;

    update volts_sommet
       set sommet = v_net, maj_le = now()
     where saison_id = new.saison_id and user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists volts_sur_pari on paris;
create trigger volts_sur_pari
  after insert or update of statut on paris
  for each row execute function clutch_volts_sur_pari();

alter table volts_sommet enable row level security;
drop policy if exists sommet_lecture on volts_sommet;
create policy sommet_lecture on volts_sommet
  for select using (user_id = auth.uid());

-- ------------------------------------------------- Le plancher demeure
-- clutch_cloturer_saison de 11_volts.sql n'est pas touchée. Elle reste
-- pour deux raisons :
--
--   · le plancher de participation (600 V dès 10 paris réglés) est ce
--     qui empêche un joueur qui finit dans le rouge de ne rien toucher
--     du tout — sans lui, une mauvaise saison ne rapporte rien, ce qui
--     est dur dans un jeu entre potes ;
--   · les paliers de rang et le call sont des rendez-vous. Le flux au
--     fil des paris donne la sensation, la clôture donne l'événement.

-- ------------------------------------------------------------ Contrôle
create or replace function clutch_volts_detail(p_user uuid default auth.uid())
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
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
$$;
