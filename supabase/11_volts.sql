-- =====================================================================
--  Clutch — 11_volts.sql
--  La monnaie cosmétique : grand livre, catalogue, inventaire, achat.
--
--  À exécuter après 10_communautes.sql. Rejouable sans effet de bord.
--
--  Décision de référence : claude/double-monnaie-frags-volts.md (16 août).
--    · Les Frags restent la bankroll misable, saisonnière, dans
--      participations.solde. Ce fichier n'y touche pas une seule fois.
--    · Les Volts s'accumulent à vie, ne se misent jamais, et ne peuvent
--      donc pas déplacer un joueur au classement.
--
--  Règle héritée de l'incident du 13 août : une policy ne doit jamais
--  interroger directement une table protégée par une policy. Toutes les
--  lectures croisées passent par les fonctions SECURITY DEFINER ci-dessous.
-- =====================================================================

-- ------------------------------------------------- Aides de sécurité
-- Aucune nouvelle : ce fichier réutilise clutch_est_admin() et
-- clutch_est_colistier(uuid) de 07_correctif_rls.sql, qui sont déjà les
-- fonctions SECURITY DEFINER par lesquelles tout le reste de la base passe.
-- On échoue tôt et clairement si 07 n'a pas été exécuté.
do $$
begin
  if to_regprocedure('clutch_est_admin()') is null
     or to_regprocedure('clutch_est_colistier(uuid)') is null then
    raise exception
      'Executer 07_correctif_rls.sql avant ce fichier : clutch_est_admin() et clutch_est_colistier(uuid) sont requises';
  end if;
end $$;

-- ----------------------------------------------------------- Catalogue
-- Un objet par (emplacement, niveau). Le niveau 1 est toujours à 0 Volt :
-- c'est le manque de départ, pas un achat — la Tour Beige jaunie et la
-- sortie graphique intégrée doivent être subies avant d'être remplacées.
create table if not exists objets_catalogue (
  id          text primary key,
  emplacement text not null,
  niveau      integer not null check (niveau between 1 and 4),
  nom         text not null,
  prix        integer not null check (prix >= 0),
  actif       boolean not null default true,
  unique (emplacement, niveau),
  -- Le niveau 1 est gratuit, les autres ne le sont pas.
  check ((niveau = 1 and prix = 0) or (niveau > 1 and prix > 0))
);
create index if not exists objets_catalogue_emplacement_idx
  on objets_catalogue (emplacement, niveau);

-- ------------------------------------------------------- Grand livre
-- Un seul journal, crédits en positif et débits en négatif. Le solde est
-- toujours la somme du journal : il ne peut pas diverger d'un total tenu
-- à part, et chaque Volt reste traçable jusqu'à son origine.
--
-- La contrainte d'unicité (user_id, origine, reference) est ce qui rend
-- toute attribution idempotente : recréditer deux fois le même badge, ou
-- clôturer deux fois la même saison, ne fait rien.
create table if not exists volts_mouvements (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profils (id) on delete cascade,
  montant   integer not null check (montant <> 0),
  origine   text not null check (origine in ('badge', 'saison', 'call', 'achat', 'ajustement')),
  reference text not null,
  cree_le   timestamptz not null default now(),
  unique (user_id, origine, reference)
);
create index if not exists volts_mouvements_user_idx
  on volts_mouvements (user_id, cree_le desc);

-- ---------------------------------------------------------- Inventaire
create table if not exists inventaire (
  user_id   uuid not null references profils (id) on delete cascade,
  objet_id  text not null references objets_catalogue (id),
  acquis_le timestamptz not null default now(),
  primary key (user_id, objet_id)
);

-- --------------------------------------------------------- Équipement
-- Un objet équipé par emplacement. Ce qu'on montre, pas ce qu'on possède.
create table if not exists equipement (
  user_id     uuid not null references profils (id) on delete cascade,
  emplacement text not null,
  objet_id    text not null references objets_catalogue (id),
  maj_le      timestamptz not null default now(),
  primary key (user_id, emplacement)
);

-- ================================================================ Solde
create or replace function clutch_solde_volts(p_user uuid default auth.uid())
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(montant), 0)::integer
  from volts_mouvements
  where user_id = p_user;
$$;

-- ================================================= Attribution de Volts
-- Primitive unique de crédit. Idempotente par (user, origine, reference).
-- Renvoie true si le crédit a été posé, false s'il l'avait déjà été.
create or replace function clutch_crediter_volts(
  p_user      uuid,
  p_montant   integer,
  p_origine   text,
  p_reference text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pose boolean;
begin
  if p_montant <= 0 then
    raise exception 'un credit doit etre strictement positif (recu : %)', p_montant
      using errcode = '22023';
  end if;
  if p_origine = 'achat' then
    raise exception 'l''origine achat est reservee a clutch_acheter_objet'
      using errcode = '22023';
  end if;

  insert into volts_mouvements (user_id, montant, origine, reference)
  values (p_user, p_montant, p_origine, p_reference)
  on conflict (user_id, origine, reference) do nothing;

  get diagnostics v_pose = row_count;
  return v_pose;
end;
$$;

-- Personne ne crédite des Volts depuis le client : cette fonction n'est
-- appelable que par le serveur (clé de service) ou par un autre SECURITY
-- DEFINER. Les rôles Supabase n'existent pas sur un PostgreSQL nu, d'où le
-- test — le script reste exécutable hors Supabase.
do $$
declare r text;
begin
  revoke execute on function clutch_crediter_volts(uuid, integer, text, text) from public;
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke execute on function clutch_crediter_volts(uuid, integer, text, text) from %I', r);
    end if;
  end loop;
end $$;

-- ========================================================== Achat
-- Atomique par construction :
--   · un verrou consultatif par joueur sérialise ses achats simultanés ;
--   · l'unicité (user, 'achat', objet) interdit le double débit même si
--     le verrou sautait ;
--   · le débit et l'entrée en inventaire sont dans la même transaction.
create or replace function clutch_acheter_objet(p_objet_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_prix        integer;
  v_emplacement text;
  v_nom         text;
  v_solde       integer;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  select prix, emplacement, nom
    into v_prix, v_emplacement, v_nom
  from objets_catalogue
  where id = p_objet_id and actif;

  if not found then
    raise exception 'objet introuvable ou retire du catalogue : %', p_objet_id
      using errcode = 'P0002';
  end if;

  if exists (select 1 from inventaire where user_id = v_user and objet_id = p_objet_id) then
    raise exception 'objet deja possede : %', p_objet_id using errcode = 'P0001';
  end if;

  select coalesce(sum(montant), 0) into v_solde
  from volts_mouvements where user_id = v_user;

  if v_solde < v_prix then
    raise exception 'solde insuffisant : % Volts requis, % disponibles', v_prix, v_solde
      using errcode = 'P0001';
  end if;

  -- Le niveau 1 est gratuit : pas de mouvement à zéro dans le journal.
  if v_prix > 0 then
    insert into volts_mouvements (user_id, montant, origine, reference)
    values (v_user, -v_prix, 'achat', p_objet_id);
  end if;

  insert into inventaire (user_id, objet_id) values (v_user, p_objet_id);

  -- On équipe ce qu'on vient d'acheter : personne n'achète pour ne pas porter.
  insert into equipement (user_id, emplacement, objet_id)
  values (v_user, v_emplacement, p_objet_id)
  on conflict (user_id, emplacement) do update
    set objet_id = excluded.objet_id, maj_le = now();

  return json_build_object(
    'objet',       p_objet_id,
    'nom',         v_nom,
    'emplacement', v_emplacement,
    'prix',        v_prix,
    'solde',       v_solde - v_prix
  );
end;
$$;

-- ====================================================== Équiper
create or replace function clutch_equiper(p_objet_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_emplacement text;
  v_niveau      integer;
begin
  if v_user is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;

  select emplacement, niveau into v_emplacement, v_niveau
  from objets_catalogue where id = p_objet_id and actif;

  if not found then
    raise exception 'objet introuvable : %', p_objet_id using errcode = 'P0002';
  end if;

  -- Le niveau 1 est le défaut de chaque emplacement : équipable sans posséder.
  if v_niveau > 1
     and not exists (select 1 from inventaire where user_id = v_user and objet_id = p_objet_id)
  then
    raise exception 'objet non possede : %', p_objet_id using errcode = 'P0001';
  end if;

  insert into equipement (user_id, emplacement, objet_id)
  values (v_user, v_emplacement, p_objet_id)
  on conflict (user_id, emplacement) do update
    set objet_id = excluded.objet_id, maj_le = now();

  return json_build_object('objet', p_objet_id, 'emplacement', v_emplacement);
end;
$$;

-- ============================================ Clôture d'une saison
-- Le robinet serveur. Barème de double-monnaie-frags-volts.md §3 :
--   participation (≥10 paris réglés)  600 V   ← le plancher
--   top 50 % au retour sur mise      +300 V
--   top 25 %                         +300 V
--   1er de sa ligue                  +300 V
-- Le plancher fait 600 sur 1500 maximum hors call, soit 40 % : au-dessus
-- du tiers que la décision impose de tenir pour que l'écart ne se creuse pas.
--
-- Indexé sur le RETOUR SUR MISE et jamais sur le solde : le volume ne
-- rapporte donc rien, conformément à la doctrine des badges.
--
-- La formule de retour sur mise est recopiée à l'identique de
-- clutch_classement (08_palier2.sql). C'est délibéré : le joueur doit
-- toucher des Volts sur exactement le chiffre qu'il lit à l'écran. Si l'une
-- des deux change un jour, l'autre doit changer dans le même commit.
create or replace function clutch_cloturer_saison(p_saison_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credites integer := 0;
  v_joueurs  integer := 0;
  r          record;
begin
  if not clutch_est_admin() then
    raise exception 'reserve aux administrateurs' using errcode = '42501';
  end if;

  if not exists (select 1 from saisons where id = p_saison_id) then
    raise exception 'saison inconnue : %', p_saison_id using errcode = 'P0002';
  end if;

  for r in
    with regles as (
      select
        p.user_id,
        count(*) filter (where p.statut in ('gagne', 'perdu')) as nb,
        case
          when coalesce(sum(p.mise) filter (where p.statut in ('gagne', 'perdu')), 0) = 0 then 0
          else round(
            (coalesce(sum(p.gain), 0) - sum(p.mise) filter (where p.statut in ('gagne', 'perdu')))::numeric
            / sum(p.mise) filter (where p.statut in ('gagne', 'perdu')) * 100, 1)
        end                                                    as roi
      from paris p
      where p.saison_id = p_saison_id
      group by p.user_id
      having count(*) filter (where p.statut in ('gagne', 'perdu')) >= 10
    ),
    classe as (
      select user_id, roi, percent_rank() over (order by roi desc) as rang
      from regles
    )
    select
      c.user_id,
      600
      + case when c.rang <= 0.50 then 300 else 0 end
      + case when c.rang <= 0.25 then 300 else 0 end
      + case when c.rang  = 0    then 300 else 0 end as montant
    from classe c
  loop
    v_joueurs := v_joueurs + 1;
    if clutch_crediter_volts(r.user_id, r.montant, 'saison', p_saison_id) then
      v_credites := v_credites + 1;
    end if;
  end loop;

  return json_build_object(
    'saison',   p_saison_id,
    'eligibles', v_joueurs,
    'credites',  v_credites,
    'deja_fait', v_joueurs - v_credites
  );
end;
$$;

-- ================================================================ Vues
-- La chambre d'un joueur : l'objet équipé, ou le niveau 1 par défaut.
create or replace view v_chambre as
select
  p.id as user_id,
  o.emplacement,
  coalesce(e.objet_id, d.id) as objet_id,
  coalesce(oe.nom, d.nom)    as nom,
  coalesce(oe.niveau, 1)     as niveau
from profils p
cross join (select distinct emplacement from objets_catalogue where actif) o
left join equipement e  on e.user_id = p.id and e.emplacement = o.emplacement
left join objets_catalogue oe on oe.id = e.objet_id
join objets_catalogue d on d.emplacement = o.emplacement and d.niveau = 1;

create or replace view v_mon_solde_volts as
select clutch_solde_volts() as solde;

-- Tout l'écran boutique en un seul aller-retour : le solde, le catalogue, et
-- ce que le joueur possède ou porte déjà. C'est un écran qu'on rafraîchit
-- après chaque achat — trois requêtes séparées s'y verraient.
create or replace function clutch_boutique()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'solde', clutch_solde_volts(),
    'objets', coalesce((
      select json_agg(
        json_build_object(
          'id',          o.id,
          'emplacement', o.emplacement,
          'niveau',      o.niveau,
          'nom',         o.nom,
          'prix',        o.prix,
          'possede',     (i.user_id is not null),
          'equipe',      (e.objet_id is not null)
        )
        order by o.emplacement, o.niveau
      )
      from objets_catalogue o
      left join inventaire i on i.objet_id = o.id  and i.user_id = auth.uid()
      left join equipement e on e.objet_id = o.id  and e.user_id = auth.uid()
      where o.actif
    ), '[]'::json)
  );
$$;

-- =============================================================== RLS
alter table objets_catalogue enable row level security;
alter table volts_mouvements enable row level security;
alter table inventaire       enable row level security;
alter table equipement       enable row level security;

-- Catalogue : lisible par tous les connectés, écrit par les admins seuls.
drop policy if exists catalogue_lecture on objets_catalogue;
create policy catalogue_lecture on objets_catalogue
  for select using (auth.uid() is not null);

drop policy if exists catalogue_admin on objets_catalogue;
create policy catalogue_admin on objets_catalogue
  for all using (clutch_est_admin()) with check (clutch_est_admin());

-- Grand livre : chacun lit le sien, personne n'écrit directement.
-- Les seules écritures passent par clutch_acheter_objet et
-- clutch_crediter_volts, qui sont SECURITY DEFINER et contournent la RLS.
drop policy if exists volts_lecture on volts_mouvements;
create policy volts_lecture on volts_mouvements
  for select using (user_id = auth.uid());

-- Inventaire : privé. Ce qu'on possède ne regarde que soi.
drop policy if exists inventaire_lecture on inventaire;
create policy inventaire_lecture on inventaire
  for select using (user_id = auth.uid());

-- Équipement : le sien, plus celui des joueurs d'une même ligue — c'est ce
-- qui rend « visiter la chambre d'un autre » possible sans exposer
-- l'inventaire ni le solde.
drop policy if exists equipement_lecture on equipement;
create policy equipement_lecture on equipement
  for select using (user_id = auth.uid() or clutch_est_colistier(user_id));

-- ================================================= Catalogue de départ
-- Les 25 produits tarifés de double-monnaie-frags-volts.md §4.
-- Les 13 restants (4 emplacements) ne sont pas encore tarifés : ils
-- s'ajoutent ici, plafond entre 900 et 1800 selon la visibilité.
insert into objets_catalogue (id, emplacement, niveau, nom, prix) values
  ('boitier-1',        'boitier',        1, 'Tour Beige',        0),
  ('boitier-2',        'boitier',        2, 'Core S',          550),
  ('boitier-3',        'boitier',        3, 'Volt Core',      1400),
  ('boitier-4',        'boitier',        4, 'Reactor X',      2400),
  ('gpu-1',            'gpu',            1, 'Sortie Intégrée',   0),
  ('gpu-2',            'gpu',            2, 'Clutch G6',       480),
  ('gpu-3',            'gpu',            3, 'Volt RTX',       1100),
  ('gpu-4',            'gpu',            4, 'Titan Prism',    2100),
  ('refroid-1',        'refroidissement',1, 'Air Core',          0),
  ('refroid-2',        'refroidissement',2, 'Tour Alu',        320),
  ('refroid-3',        'refroidissement',3, 'Aqua Loop',       850),
  ('refroid-4',        'refroidissement',4, 'Reactor Loop',   1500),
  ('vent-1',           'ventilation',    1, 'Souffle Unique',    0),
  ('vent-2',           'ventilation',    2, 'Trio Blanc',      380),
  ('vent-3',           'ventilation',    3, 'Trio ARGB',       900),
  ('vent-4',           'ventilation',    4, 'Flux Total',     1650),
  ('memoire-1',        'memoire',        1, 'Core 16',           0),
  ('memoire-2',        'memoire',        2, 'Pulse 32',        600),
  ('memoire-3',        'memoire',        3, 'Prism 64',       1200),
  ('cablage-1',        'cablage',        1, 'Plat de Nouilles',  0),
  ('cablage-2',        'cablage',        2, 'Rangé Derrière',  260),
  ('cablage-3',        'cablage',        3, 'Gainé Club',      700),
  ('piece-1',          'piece',          1, 'Le Coin',           0),
  ('piece-2',          'piece',          2, 'Studio',         1900),
  ('piece-3',          'piece',          3, 'Loft Clutch',    4200)
on conflict (id) do update
  set emplacement = excluded.emplacement,
      niveau      = excluded.niveau,
      nom         = excluded.nom,
      prix        = excluded.prix;
