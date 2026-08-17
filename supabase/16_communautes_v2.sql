-- =====================================================================
-- Clutch — 16. Communautés V2 persistantes
--
-- Fiole I est la forme de départ. Les mutations permanentes sont :
--   10 -> Flacon II (+200 Frags)
--   50 -> Bombonne III (+300)
--  100 -> Calice IV (+500)
--  500 -> Alambic V (+750)
-- 1000 -> Cornue VI (+1000)
-- 5000 -> Océan VII (+1500)
--
-- Les tables techniques ne sont pas exposées directement au Data API :
-- l'interface passe par classement_communautes(), qui ne renvoie que des
-- agrégats et, pour l'utilisateur courant, sa propre contribution.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Métadonnées de présence / changement de faction
-- ---------------------------------------------------------------------
alter table public.profils
  add column if not exists equipe_favorite_changee_le timestamptz,
  add column if not exists equipe_favorite_rejointe_le timestamptz;

-- Les membres déjà présents avant cette migration n'ont pas de faux événement
-- de croissance. On peut toutefois dater leur appartenance au plus tard de la
-- création du compte pour afficher une ancienneté raisonnable.
update public.profils
set equipe_favorite_rejointe_le = coalesce(equipe_favorite_rejointe_le, cree_le)
where equipe_favorite_id is not null;

-- ---------------------------------------------------------------------
-- État permanent d'une faction
-- ---------------------------------------------------------------------
create table if not exists public.communaute_etat (
  equipe_id       text primary key references public.equipes(id) on delete cascade,
  niveau_atteint  smallint not null default 1 check (niveau_atteint between 1 and 7),
  atteint_le      timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);

create table if not exists public.communaute_mouvements (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profils(id) on delete set null,
  equipe_id  text not null references public.equipes(id) on delete cascade,
  delta      smallint not null check (delta in (-1, 1)),
  cree_le    timestamptz not null default now()
);
create index if not exists communaute_mouvements_equipe_date_idx
  on public.communaute_mouvements(equipe_id, cree_le desc);

create table if not exists public.communaute_mutations (
  id                  bigint generated always as identity primary key,
  equipe_id           text not null references public.equipes(id) on delete cascade,
  niveau              smallint not null check (niveau between 2 and 7),
  nom                  text not null,
  seuil                integer not null check (seuil > 0),
  recompense_frags     integer not null check (recompense_frags >= 0),
  membres_au_moment    integer not null check (membres_au_moment >= 0),
  cree_le              timestamptz not null default now(),
  unique (equipe_id, niveau)
);
create index if not exists communaute_mutations_equipe_date_idx
  on public.communaute_mutations(equipe_id, cree_le desc);

-- Défense en profondeur : ces tables sont internes. Même si public est exposé,
-- aucune donnée brute de mouvements/membres n'est lisible depuis le navigateur.
alter table public.communaute_etat enable row level security;
alter table public.communaute_mouvements enable row level security;
alter table public.communaute_mutations enable row level security;
revoke all on table public.communaute_etat from anon, authenticated;
revoke all on table public.communaute_mouvements from anon, authenticated;
revoke all on table public.communaute_mutations from anon, authenticated;

-- Bootstrap sans récompense rétroactive : on mémorise seulement le niveau que
-- les effectifs actuels justifient déjà.
insert into public.communaute_etat (equipe_id, niveau_atteint, atteint_le, maj_le)
select
  e.id,
  case
    when count(p.id) >= 5000 then 7
    when count(p.id) >= 1000 then 6
    when count(p.id) >= 500  then 5
    when count(p.id) >= 100  then 4
    when count(p.id) >= 50   then 3
    when count(p.id) >= 10   then 2
    else 1
  end::smallint,
  now(),
  now()
from public.equipes e
left join public.profils p on p.equipe_favorite_id = e.id
group by e.id
on conflict (equipe_id) do nothing;

-- ---------------------------------------------------------------------
-- Cooldown : 7 jours entre deux changements une fois une faction choisie
-- ---------------------------------------------------------------------
create or replace function public.clutch_verifier_changement_faction()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Ces timestamps sont pilotés par la base, jamais par un PATCH client.
  if new.equipe_favorite_id is not distinct from old.equipe_favorite_id then
    new.equipe_favorite_changee_le := old.equipe_favorite_changee_le;
    new.equipe_favorite_rejointe_le := old.equipe_favorite_rejointe_le;
    return new;
  end if;

  if old.equipe_favorite_id is not null
     and old.equipe_favorite_changee_le is not null
     and old.equipe_favorite_changee_le > now() - interval '7 days' then
    raise exception 'Changement de faction bloqué jusqu’au %',
      to_char(old.equipe_favorite_changee_le + interval '7 days', 'DD/MM/YYYY HH24:MI');
  end if;

  new.equipe_favorite_changee_le := now();
  new.equipe_favorite_rejointe_le := case
    when new.equipe_favorite_id is null then null
    else now()
  end;
  return new;
end;
$$;

revoke all on function public.clutch_verifier_changement_faction() from public, anon, authenticated;

drop trigger if exists profils_changement_faction_avant on public.profils;
create trigger profils_changement_faction_avant
before update of equipe_favorite_id, equipe_favorite_changee_le, equipe_favorite_rejointe_le
on public.profils
for each row execute function public.clutch_verifier_changement_faction();

-- ---------------------------------------------------------------------
-- Évaluation atomique d'une mutation + récompense collective
-- ---------------------------------------------------------------------
create or replace function public.clutch_evaluer_mutation(p_equipe_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membres integer;
  v_cible smallint;
  v_courant smallint;
  v_niveau smallint;
  v_nom text;
  v_seuil integer;
  v_recompense integer;
  v_saison public.saisons%rowtype;
begin
  select count(*)::integer into v_membres
  from public.profils
  where equipe_favorite_id = p_equipe_id;

  v_cible := case
    when v_membres >= 5000 then 7
    when v_membres >= 1000 then 6
    when v_membres >= 500  then 5
    when v_membres >= 100  then 4
    when v_membres >= 50   then 3
    when v_membres >= 10   then 2
    else 1
  end;

  insert into public.communaute_etat(equipe_id, niveau_atteint)
  values (p_equipe_id, 1)
  on conflict (equipe_id) do nothing;

  select niveau_atteint into v_courant
  from public.communaute_etat
  where equipe_id = p_equipe_id
  for update;

  if v_cible <= v_courant then
    update public.communaute_etat set maj_le = now() where equipe_id = p_equipe_id;
    return;
  end if;

  select * into v_saison
  from public.saisons
  where now() between debut and fin
  order by debut desc
  limit 1;

  for v_niveau in (v_courant + 1)..v_cible loop
    select
      case v_niveau
        when 2 then 'Flacon'
        when 3 then 'Bombonne'
        when 4 then 'Calice'
        when 5 then 'Alambic'
        when 6 then 'Cornue'
        when 7 then 'Océan'
      end,
      case v_niveau
        when 2 then 10
        when 3 then 50
        when 4 then 100
        when 5 then 500
        when 6 then 1000
        when 7 then 5000
      end,
      case v_niveau
        when 2 then 200
        when 3 then 300
        when 4 then 500
        when 5 then 750
        when 6 then 1000
        when 7 then 1500
      end
    into v_nom, v_seuil, v_recompense;

    insert into public.communaute_mutations(
      equipe_id, niveau, nom, seuil, recompense_frags, membres_au_moment
    ) values (
      p_equipe_id, v_niveau, v_nom, v_seuil, v_recompense, v_membres
    )
    on conflict (equipe_id, niveau) do nothing;

    -- Une récompense de mutation appartient à la saison en cours, exactement
    -- comme les autres Frags. Les membres sans ligne de participation reçoivent
    -- leur solde initial + la récompense ; les autres sont simplement crédités.
    if v_saison.id is not null and v_recompense > 0 then
      insert into public.participations(
        saison_id, user_id, solde, derniere_prime, rejoint_le, serie_prime
      )
      select
        v_saison.id,
        p.id,
        v_saison.solde_initial + v_recompense,
        null,
        now(),
        0
      from public.profils p
      where p.equipe_favorite_id = p_equipe_id
      on conflict (saison_id, user_id)
      do update set solde = public.participations.solde + v_recompense;
    end if;

    update public.communaute_etat
    set niveau_atteint = v_niveau,
        atteint_le = now(),
        maj_le = now()
    where equipe_id = p_equipe_id;
  end loop;
end;
$$;

revoke all on function public.clutch_evaluer_mutation(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Journaliser les entrées/sorties et déclencher l'évaluation
-- ---------------------------------------------------------------------
create or replace function public.clutch_journaliser_faction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.equipe_favorite_id is distinct from new.equipe_favorite_id then
    if old.equipe_favorite_id is not null then
      insert into public.communaute_mouvements(user_id, equipe_id, delta)
      values (new.id, old.equipe_favorite_id, -1);
    end if;

    if new.equipe_favorite_id is not null then
      insert into public.communaute_mouvements(user_id, equipe_id, delta)
      values (new.id, new.equipe_favorite_id, 1);
      perform public.clutch_evaluer_mutation(new.equipe_favorite_id);
    end if;
  elsif tg_op = 'DELETE' and old.equipe_favorite_id is not null then
    insert into public.communaute_mouvements(user_id, equipe_id, delta)
    values (null, old.equipe_favorite_id, -1);
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.clutch_journaliser_faction() from public, anon, authenticated;

drop trigger if exists profils_journal_faction_apres on public.profils;
create trigger profils_journal_faction_apres
after update of equipe_favorite_id or delete
on public.profils
for each row execute function public.clutch_journaliser_faction();

-- ---------------------------------------------------------------------
-- Classement V3 : vitesse réelle + progression + histoire
-- ---------------------------------------------------------------------
drop function if exists public.classement_communautes();

create or replace function public.classement_communautes()
returns table (
  equipe_id                  text,
  nom                        text,
  tag                        text,
  jeu                        text,
  elo                        integer,
  logo                       text,
  membres                    bigint,
  moi                        boolean,
  niveau_atteint             smallint,
  croissance_24h             integer,
  croissance_7j              integer,
  membre_depuis              timestamptz,
  pronos_depuis              bigint,
  mutations_vecues           bigint,
  dernier_evenement_id       bigint,
  dernier_evenement_niveau   smallint,
  dernier_evenement_nom      text,
  dernier_evenement_le       timestamptz,
  dernier_evenement_recompense integer,
  historique                 jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with effectifs as (
    select e.id as equipe_id, count(p.id)::bigint as membres
    from public.equipes e
    left join public.profils p on p.equipe_favorite_id = e.id
    group by e.id
  ),
  croissance as (
    select
      m.equipe_id,
      coalesce(sum(m.delta) filter (where m.cree_le >= now() - interval '24 hours'), 0)::integer as croissance_24h,
      coalesce(sum(m.delta) filter (where m.cree_le >= now() - interval '7 days'), 0)::integer as croissance_7j
    from public.communaute_mouvements m
    group by m.equipe_id
  ),
  mon_profil as (
    select
      p.id,
      p.equipe_favorite_id,
      coalesce(p.equipe_favorite_rejointe_le, p.cree_le) as membre_depuis
    from public.profils p
    where p.id = auth.uid()
  )
  select
    e.id,
    e.nom,
    e.tag,
    e.jeu,
    e.elo,
    e.logo,
    ef.membres,
    (mp.id is not null and mp.equipe_favorite_id = e.id) as moi,
    coalesce(ce.niveau_atteint, 1)::smallint,
    coalesce(c.croissance_24h, 0),
    coalesce(c.croissance_7j, 0),
    case when mp.equipe_favorite_id = e.id then mp.membre_depuis end,
    case when mp.equipe_favorite_id = e.id then (
      select count(*)
      from public.paris pa
      where pa.user_id = mp.id
        and pa.cree_le >= mp.membre_depuis
    ) else 0 end,
    case when mp.equipe_favorite_id = e.id then (
      select count(*)
      from public.communaute_mutations cmv
      where cmv.equipe_id = e.id
        and cmv.cree_le >= mp.membre_depuis
    ) else 0 end,
    last_mut.id,
    last_mut.niveau,
    last_mut.nom,
    last_mut.cree_le,
    last_mut.recompense_frags,
    coalesce(hist.items, '[]'::jsonb)
  from public.equipes e
  join effectifs ef on ef.equipe_id = e.id
  left join public.communaute_etat ce on ce.equipe_id = e.id
  left join croissance c on c.equipe_id = e.id
  left join mon_profil mp on mp.equipe_favorite_id = e.id
  left join lateral (
    select cm.id, cm.niveau, cm.nom, cm.cree_le, cm.recompense_frags
    from public.communaute_mutations cm
    where cm.equipe_id = e.id
    order by cm.cree_le desc
    limit 1
  ) last_mut on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'niveau', x.niveau,
        'nom', x.nom,
        'seuil', x.seuil,
        'recompense_frags', x.recompense_frags,
        'membres', x.membres_au_moment,
        'cree_le', x.cree_le
      ) order by x.cree_le desc
    ) as items
    from (
      select *
      from public.communaute_mutations cm2
      where cm2.equipe_id = e.id
      order by cm2.cree_le desc
      limit 5
    ) x
  ) hist on true
  where ef.membres > 0
  order by
    coalesce(c.croissance_24h, 0) desc,
    coalesce(c.croissance_7j, 0) desc,
    ef.membres desc,
    e.nom asc;
$$;

revoke all on function public.classement_communautes() from public;
grant execute on function public.classement_communautes() to anon, authenticated;
