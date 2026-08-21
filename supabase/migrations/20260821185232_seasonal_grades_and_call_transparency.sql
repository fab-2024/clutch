-- Lots 1.2 + 1.3 — transparent calls and server-owned seasonal grades.
--
-- The mobile client only renders these contracts. Grade thresholds, placement
-- visibility, rank/percentile calculations and call disclosure rules live here.

-- ---------------------------------------------------------------------------
-- Canonical seasonal grade scale
-- ---------------------------------------------------------------------------

create or replace function private.clutch_grade_config_v1()
returns table (
  ordre smallint,
  cle text,
  libelle text,
  minimum integer
)
language sql
immutable
security invoker
set search_path = ''
as $$
  values
    (0::smallint, 'recrue'::text, 'Recrue'::text, 0),
    (1::smallint, 'challenger'::text, 'Challenger'::text, 1200),
    (2::smallint, 'elite'::text, 'Élite'::text, 1600),
    (3::smallint, 'master'::text, 'Master'::text, 2000),
    (4::smallint, 'clutch'::text, 'Clutch'::text, 2400)
$$;

create or replace function private.clutch_grade_ordre_v1(p_frags integer)
returns smallint
language sql
immutable
security invoker
set search_path = ''
as $$
  select g.ordre
  from private.clutch_grade_config_v1() g
  where g.minimum <= greatest(0, coalesce(p_frags, 0))
  order by g.minimum desc
  limit 1
$$;

create or replace function public.clutch_grade_frags_v1(
  p_frags integer,
  p_pronostics_regles integer
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with contexte as (
    select
      greatest(0, coalesce(p_frags, 0)) as frags,
      greatest(0, coalesce(p_pronostics_regles, 0)) as regles,
      public.clutch_frags_nb_placements() as objectif
  ), actuel as (
    select g.*
    from private.clutch_grade_config_v1() g, contexte c
    where g.minimum <= c.frags
    order by g.minimum desc
    limit 1
  ), suivant as (
    select g.*
    from private.clutch_grade_config_v1() g, actuel a
    where g.ordre = a.ordre + 1
    limit 1
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'classe', c.regles >= c.objectif,
    'objectif_placements', c.objectif,
    'placements_restants', greatest(0, c.objectif - c.regles),
    'cle', case when c.regles >= c.objectif then a.cle end,
    'libelle', case when c.regles >= c.objectif then a.libelle end,
    'ordre', case when c.regles >= c.objectif then a.ordre end,
    'minimum', case when c.regles >= c.objectif then a.minimum end,
    'plafond', case when c.regles >= c.objectif then s.minimum end,
    'prochaine_cle', case when c.regles >= c.objectif then s.cle end,
    'prochain_libelle', case when c.regles >= c.objectif then s.libelle end,
    'prochain_minimum', case when c.regles >= c.objectif then s.minimum end,
    'progression', case
      when c.regles < c.objectif then least(1::numeric, c.regles::numeric / greatest(c.objectif, 1))
      when s.minimum is null then 1::numeric
      else greatest(
        0::numeric,
        least(1::numeric, (c.frags - a.minimum)::numeric / greatest(s.minimum - a.minimum, 1))
      )
    end
  ))
  from contexte c
  cross join actuel a
  left join suivant s on true
$$;

comment on function public.clutch_grade_frags_v1(integer, integer) is
  'Canonical five-grade seasonal scale. Grade fields stay absent until five settled calls.';

revoke all privileges on function private.clutch_grade_config_v1()
  from public, anon, authenticated, service_role;
revoke all privileges on function private.clutch_grade_ordre_v1(integer)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_grade_frags_v1(integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_grade_frags_v1(integer, integer)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Durable seasonal records and classified-only rank snapshots
-- ---------------------------------------------------------------------------

alter table public.classements_frags
  add column if not exists meilleur_grade_ordre smallint,
  add column if not exists meilleur_rang integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.classements_frags'::regclass
      and conname = 'classements_frags_meilleur_grade_ordre_check'
  ) then
    alter table public.classements_frags
      add constraint classements_frags_meilleur_grade_ordre_check
      check (meilleur_grade_ordre between 0 and 4);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.classements_frags'::regclass
      and conname = 'classements_frags_meilleur_rang_check'
  ) then
    alter table public.classements_frags
      add constraint classements_frags_meilleur_rang_check
      check (meilleur_rang > 0);
  end if;
end;
$$;

create or replace function private.clutch_rang_frags_v1(
  p_saison_id text,
  p_user_id uuid
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select q.rang::integer
  from (
    select
      c.user_id,
      row_number() over (
        order by c.frags desc,
                 c.pronostics_gagnes desc,
                 c.maj_le asc,
                 c.user_id asc
      ) as rang
    from public.classements_frags c
    where c.saison_id = p_saison_id
      and c.pronostics_regles >= public.clutch_frags_nb_placements()
  ) q
  where q.user_id = p_user_id
$$;

revoke all privileges on function private.clutch_rang_frags_v1(text, uuid)
  from public, anon, authenticated, service_role;

update public.classements_frags c
set meilleur_grade_ordre = private.clutch_grade_ordre_v1(c.pic_frags)
where c.pronostics_regles >= public.clutch_frags_nb_placements()
  and c.meilleur_grade_ordre is null;

with classes as (
  select
    c.saison_id,
    c.user_id,
    row_number() over (
      partition by c.saison_id
      order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc, c.user_id asc
    )::integer as rang
  from public.classements_frags c
  where c.pronostics_regles >= public.clutch_frags_nb_placements()
)
update public.classements_frags c
set meilleur_rang = classes.rang
from classes
where c.saison_id = classes.saison_id
  and c.user_id = classes.user_id
  and c.meilleur_rang is null;

create or replace function private.clutch_progression_saison_v1(
  p_saison_id text,
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_c public.classements_frags%rowtype;
  v_frags integer;
  v_pic integer;
  v_regles integer;
  v_gagnes integer;
  v_rang integer;
  v_total integer;
  v_percentile numeric;
  v_grade jsonb;
  v_meilleur_grade jsonb;
begin
  select * into v_c
  from public.classements_frags c
  where c.saison_id = p_saison_id
    and c.user_id = p_user_id;

  v_frags := coalesce(v_c.frags, public.clutch_frags_initial());
  v_pic := coalesce(v_c.pic_frags, public.clutch_frags_initial());
  v_regles := coalesce(v_c.pronostics_regles, 0);
  v_gagnes := coalesce(v_c.pronostics_gagnes, 0);
  v_grade := public.clutch_grade_frags_v1(v_frags, v_regles);

  if v_regles >= public.clutch_frags_nb_placements() then
    select ranked.rang, ranked.total
      into v_rang, v_total
    from (
      select
        c.user_id,
        row_number() over (
          order by c.frags desc, c.pronostics_gagnes desc, c.maj_le asc, c.user_id asc
        )::integer as rang,
        count(*) over ()::integer as total
      from public.classements_frags c
      where c.saison_id = p_saison_id
        and c.pronostics_regles >= public.clutch_frags_nb_placements()
    ) ranked
    where ranked.user_id = p_user_id;

    if v_rang is not null then
      v_percentile := case
        when coalesce(v_total, 0) <= 1 then 100::numeric
        else round((1 - (v_rang - 1)::numeric / (v_total - 1)) * 100, 1)
      end;
    end if;
  end if;

  if v_c.meilleur_grade_ordre is not null then
    select jsonb_build_object(
      'cle', g.cle,
      'libelle', g.libelle,
      'ordre', g.ordre,
      'minimum', g.minimum
    ) into v_meilleur_grade
    from private.clutch_grade_config_v1() g
    where g.ordre = v_c.meilleur_grade_ordre;
  end if;

  return jsonb_build_object(
    'saison_id', p_saison_id,
    'frags', v_frags,
    'pic_frags', v_pic,
    'pronostics_regles', v_regles,
    'pronostics_gagnes', v_gagnes,
    'placements_restants', greatest(0, public.clutch_frags_nb_placements() - v_regles),
    'provisoire', v_regles < public.clutch_frags_nb_placements(),
    'grade', v_grade,
    'rang', v_rang,
    'percentile', v_percentile,
    'joueurs_classes', coalesce(v_total, 0),
    'meilleur_grade', v_meilleur_grade,
    'meilleur_rang', v_c.meilleur_rang
  );
end;
$$;

revoke all privileges on function private.clutch_progression_saison_v1(text, uuid)
  from public, anon, authenticated, service_role;

create or replace function public.clutch_etat_frags(p_saison_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  return private.clutch_progression_saison_v1(p_saison_id, v_user);
end;
$$;

create or replace function public.clutch_progression_profil_v1(p_pseudo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_target public.profils%rowtype;
  v_viewer uuid := auth.uid();
  v_saison record;
begin
  if p_pseudo is null or length(trim(p_pseudo)) < 1 or length(trim(p_pseudo)) > 48 then
    return null;
  end if;

  select * into v_target
  from public.profils p
  where lower(p.pseudo) = lower(trim(p_pseudo))
  limit 1;

  if not found then return null; end if;
  if not v_target.profil_public and v_viewer is distinct from v_target.id then return null; end if;

  select s.id, s.nom into v_saison
  from public.saisons s
  order by (s.debut <= now() and s.fin > now()) desc, s.debut desc
  limit 1;

  return private.clutch_progression_saison_v1(v_saison.id, v_target.id)
    || jsonb_build_object('saison_nom', v_saison.nom);
end;
$$;

comment on function public.clutch_progression_profil_v1(text) is
  'Public-profile-safe seasonal grade, progress, exact classified rank, percentile and season records.';

revoke all privileges on function public.clutch_etat_frags(text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_progression_profil_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_etat_frags(text)
  to authenticated, service_role;
grant execute on function public.clutch_progression_profil_v1(text)
  to anon, authenticated, service_role;

-- Keep ranking lists useful while ensuring placements never receive a rank.
create or replace function public.clutch_classement_frags(p_saison_id text)
returns table (
  rang bigint,
  id uuid,
  pseudo text,
  frags integer,
  pic_frags integer,
  pronostics_regles integer,
  pronostics_gagnes integer,
  taux_reussite numeric,
  provisoire boolean,
  moi boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  return query
  with source as (
    select
      c.user_id,
      p.pseudo,
      c.frags,
      c.pic_frags,
      c.pronostics_regles,
      c.pronostics_gagnes,
      c.maj_le,
      c.pronostics_regles < public.clutch_frags_nb_placements() as provisoire
    from public.classements_frags c
    join public.profils p on p.id = c.user_id
    where c.saison_id = p_saison_id
  ), classes as (
    select
      s.user_id,
      row_number() over (
        order by s.frags desc, s.pronostics_gagnes desc, s.maj_le asc, s.user_id asc
      ) as rang
    from source s
    where not s.provisoire
  )
  select
    c.rang,
    s.user_id,
    s.pseudo,
    s.frags,
    s.pic_frags,
    s.pronostics_regles,
    s.pronostics_gagnes,
    case when s.pronostics_regles = 0 then 0::numeric
         else round(s.pronostics_gagnes::numeric / s.pronostics_regles * 100, 1) end,
    s.provisoire,
    s.user_id = auth.uid()
  from source s
  left join classes c on c.user_id = s.user_id
  order by s.provisoire asc, c.rang nulls last, s.frags desc, s.user_id asc;
end;
$$;

revoke all privileges on function public.clutch_classement_frags(text)
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_classement_frags(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Settlement keeps season records in the same transaction as the verdict.
-- ---------------------------------------------------------------------------

create or replace function private.clutch_resoudre_pronostics_classes()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'private', 'pg_temp'
as $$
declare
  r public.pronostics_classes%rowtype;
  v_gagnant boolean;
  v_delta integer;
  v_frags_apres integer;
begin
  if new.statut = 'annule' and old.statut is distinct from 'annule' then
    update public.pronostics_classes
    set statut = 'annule',
        delta_frags = 0,
        regle_le = now(),
        revele_le = now()
    where match_id = new.id and statut = 'en_cours';
    return new;
  end if;

  if new.statut <> 'termine' or old.statut = 'termine' then return new; end if;
  if new.score_a is null or new.score_b is null or new.score_a = new.score_b then
    raise exception 'Impossible de regler les Frags : score final invalide pour %', new.id;
  end if;

  insert into public.classements_frags(saison_id,user_id,frags,pic_frags)
  select distinct
    p.saison_id,
    p.user_id,
    public.clutch_frags_initial(),
    public.clutch_frags_initial()
  from public.pronostics_classes p
  where p.match_id = new.id and p.statut = 'en_cours'
  on conflict(saison_id,user_id) do nothing;

  update public.pronostics_classes p
  set frags_avant = c.frags,
      rang_avant = private.clutch_rang_frags_v1(p.saison_id,p.user_id)
  from public.classements_frags c
  where p.match_id = new.id
    and p.statut = 'en_cours'
    and c.saison_id = p.saison_id
    and c.user_id = p.user_id;

  for r in
    select *
    from public.pronostics_classes
    where match_id = new.id and statut = 'en_cours'
    order by cree_le,id
    for update
  loop
    v_gagnant := case
      when r.choix = 'a' then new.score_a > new.score_b
      else new.score_b > new.score_a
    end;

    v_delta := public.clutch_delta_frags_conviction(
      r.proba_scoring,
      v_gagnant,
      r.k_frags,
      coalesce(r.conviction,'normal')
    );

    v_frags_apres := coalesce(r.frags_avant, public.clutch_frags_initial()) + v_delta;

    update public.classements_frags
    set frags = v_frags_apres,
        pic_frags = greatest(pic_frags,v_frags_apres),
        pronostics_regles = pronostics_regles + 1,
        pronostics_gagnes = pronostics_gagnes + case when v_gagnant then 1 else 0 end,
        meilleur_grade_ordre = case
          when pronostics_regles + 1 >= public.clutch_frags_nb_placements()
            then greatest(
              coalesce(meilleur_grade_ordre, 0),
              private.clutch_grade_ordre_v1(v_frags_apres)
            )
          else meilleur_grade_ordre
        end,
        maj_le = now()
    where saison_id = r.saison_id and user_id = r.user_id;

    update public.pronostics_classes
    set statut = case when v_gagnant then 'gagne' else 'perdu' end,
        delta_frags = v_delta,
        frags_apres = v_frags_apres,
        regle_le = now(),
        revele_le = null
    where id = r.id;
  end loop;

  update public.pronostics_classes p
  set rang_apres = private.clutch_rang_frags_v1(p.saison_id,p.user_id)
  where p.match_id = new.id
    and p.statut in ('gagne','perdu')
    and p.rang_apres is null;

  update public.classements_frags c
  set meilleur_rang = case
    when c.meilleur_rang is null then p.rang_apres
    else least(c.meilleur_rang, p.rang_apres)
  end
  from public.pronostics_classes p
  where p.match_id = new.id
    and p.saison_id = c.saison_id
    and p.user_id = c.user_id
    and p.rang_apres is not null;

  return new;
end;
$$;

revoke all privileges on function private.clutch_resoudre_pronostics_classes()
  from public, anon, authenticated, service_role;

drop trigger if exists frags_regler_pronostics on public.matchs;
create trigger frags_regler_pronostics
after update of statut,score_a,score_b on public.matchs
for each row execute function private.clutch_resoudre_pronostics_classes();

-- ---------------------------------------------------------------------------
-- Mes Calls: four explicit states and disclosure only after validation.
-- ---------------------------------------------------------------------------

create index if not exists pronostics_classes_match_distribution_idx
  on public.pronostics_classes (match_id, choix)
  where statut <> 'annule';

create or replace function public.clutch_mes_calls_v1(p_saison_id text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_saison record;
  v_payload jsonb;
begin
  if v_user is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  if p_saison_id is null then
    select s.id, s.nom into v_saison
    from public.saisons s
    order by (s.debut <= now() and s.fin > now()) desc, s.debut desc
    limit 1;
  else
    select s.id, s.nom into v_saison
    from public.saisons s
    where s.id = p_saison_id;
  end if;

  if v_saison.id is null then
    return jsonb_build_object(
      'saison_id', null,
      'saison_nom', null,
      'compteurs', jsonb_build_object('ouverts',0,'verrouilles',0,'reussis',0,'manques',0),
      'ouverts', '[]'::jsonb,
      'verrouilles', '[]'::jsonb,
      'reussis', '[]'::jsonb,
      'manques', '[]'::jsonb
    );
  end if;

  with mes_pronostics as (
    select p.*
    from public.pronostics_classes p
    where p.user_id = v_user
      and p.saison_id = v_saison.id
      and p.statut <> 'annule'
  ), distributions as (
    select
      p.match_id,
      count(*)::integer as total,
      count(*) filter (where p.choix = 'a')::integer as total_a,
      count(*) filter (where p.choix = 'b')::integer as total_b
    from public.pronostics_classes p
    where p.saison_id = v_saison.id
      and p.statut <> 'annule'
    group by p.match_id
  ), items as (
    select
      m.debut,
      case
        when p.id is null then 'ouvert'
        when p.statut = 'en_cours' then 'verrouille'
        when p.statut = 'gagne' then 'reussi'
        when p.statut = 'perdu' then 'manque'
      end as etat,
      jsonb_build_object(
        'id', coalesce(p.id::text, m.id),
        'pronostic_id', p.id,
        'match_id', m.id,
        'saison_id', m.saison_id,
        'etat', case
          when p.id is null then 'ouvert'
          when p.statut = 'en_cours' then 'verrouille'
          when p.statut = 'gagne' then 'reussi'
          when p.statut = 'perdu' then 'manque'
        end,
        'jeu', m.jeu,
        'evenement', m.evenement,
        'format', m.format,
        'debut', m.debut,
        'statut_match', m.statut,
        'equipe_a', m.equipe_a,
        'tag_a', m.tag_a,
        'equipe_b', m.equipe_b,
        'tag_b', m.tag_b,
        'score_a', m.score_a,
        'score_b', m.score_b,
        'choix', p.choix,
        'statut', p.statut,
        'delta_frags', p.delta_frags,
        'verrouille_le', p.cree_le,
        'ferme_le', m.debut,
        'regle_le', p.regle_le,
        'participants', coalesce(d.total, 0),
        'distribution', case when p.id is null then null else jsonb_build_object(
          'total', coalesce(d.total, 0),
          'a', coalesce(d.total_a, 0),
          'b', coalesce(d.total_b, 0),
          'a_pct', case when coalesce(d.total, 0) = 0 then 0 else round(d.total_a::numeric / d.total * 100, 1) end,
          'b_pct', case when coalesce(d.total, 0) = 0 then 0 else round(d.total_b::numeric / d.total * 100, 1) end
        ) end,
        'regle_resolution', jsonb_build_object(
          'cle', 'vainqueur_match',
          'libelle', 'Vainqueur de la série',
          'detail', 'Le call est réussi si l’équipe choisie remporte le score final de la série.'
        ),
        'source_resultat', case when p.statut in ('gagne','perdu') then 'validation_clutch' end,
        'source_resultat_label', case when p.statut in ('gagne','perdu') then 'Validation Clutch' end
      ) as item
    from public.v_matchs m
    left join mes_pronostics p on p.match_id = m.id
    left join distributions d on d.match_id = m.id
    where m.saison_id = v_saison.id
      and (
        p.id is not null
        or (m.statut = 'a_venir' and m.debut > now())
      )
  )
  select jsonb_build_object(
    'saison_id', v_saison.id,
    'saison_nom', v_saison.nom,
    'compteurs', jsonb_build_object(
      'ouverts', count(*) filter (where etat = 'ouvert'),
      'verrouilles', count(*) filter (where etat = 'verrouille'),
      'reussis', count(*) filter (where etat = 'reussi'),
      'manques', count(*) filter (where etat = 'manque')
    ),
    'ouverts', coalesce(jsonb_agg(item order by debut asc) filter (where etat = 'ouvert'), '[]'::jsonb),
    'verrouilles', coalesce(jsonb_agg(item order by debut asc) filter (where etat = 'verrouille'), '[]'::jsonb),
    'reussis', coalesce(jsonb_agg(item order by debut desc) filter (where etat = 'reussi'), '[]'::jsonb),
    'manques', coalesce(jsonb_agg(item order by debut desc) filter (where etat = 'manque'), '[]'::jsonb)
  ) into v_payload
  from items;

  return v_payload;
end;
$$;

create or replace function public.clutch_call_context_v1(p_match_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_match record;
  v_prediction public.pronostics_classes%rowtype;
  v_total integer := 0;
  v_total_a integer := 0;
  v_total_b integer := 0;
begin
  if v_user is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  select m.* into v_match
  from public.v_matchs m
  where m.id = p_match_id;
  if not found then
    raise exception 'Match introuvable.' using errcode = 'P0002';
  end if;

  select p.* into v_prediction
  from public.pronostics_classes p
  where p.user_id = v_user
    and p.match_id = p_match_id
  limit 1;

  select
    count(*)::integer,
    count(*) filter (where p.choix = 'a')::integer,
    count(*) filter (where p.choix = 'b')::integer
  into v_total, v_total_a, v_total_b
  from public.pronostics_classes p
  where p.match_id = p_match_id
    and p.statut <> 'annule';

  return jsonb_build_object(
    'match_id', p_match_id,
    'participants', v_total,
    'ferme_le', v_match.debut,
    'verrouille_le', v_prediction.cree_le,
    'regle_resolution', jsonb_build_object(
      'cle', 'vainqueur_match',
      'libelle', 'Vainqueur de la série',
      'detail', 'Le call est réussi si l’équipe choisie remporte le score final de la série.'
    ),
    'distribution', case when v_prediction.id is null then null else jsonb_build_object(
      'total', v_total,
      'a', v_total_a,
      'b', v_total_b,
      'a_pct', case when v_total = 0 then 0 else round(v_total_a::numeric / v_total * 100, 1) end,
      'b_pct', case when v_total = 0 then 0 else round(v_total_b::numeric / v_total * 100, 1) end
    ) end,
    'prediction', case when v_prediction.id is null then null else jsonb_build_object(
      'id', v_prediction.id,
      'match_id', v_prediction.match_id,
      'choix', v_prediction.choix,
      'statut', v_prediction.statut,
      'proba_figee', v_prediction.proba_figee,
      'proba_scoring', v_prediction.proba_scoring,
      'k_frags', v_prediction.k_frags,
      'delta_frags', v_prediction.delta_frags,
      'conviction', v_prediction.conviction,
      'multiplicateur_conviction', v_prediction.multiplicateur_conviction,
      'cree_le', v_prediction.cree_le,
      'regle_le', v_prediction.regle_le
    ) end,
    'source_resultat', case when v_prediction.statut in ('gagne','perdu') then 'validation_clutch' end,
    'source_resultat_label', case when v_prediction.statut in ('gagne','perdu') then 'Validation Clutch' end
  );
end;
$$;

comment on function public.clutch_mes_calls_v1(text) is
  'Own-call dashboard with open/locked/success/missed states and post-validation distribution disclosure.';
comment on function public.clutch_call_context_v1(text) is
  'Single-match call transparency contract; aggregate distribution is disclosed only after the caller validates.';

revoke all privileges on function public.clutch_mes_calls_v1(text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_call_context_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_mes_calls_v1(text)
  to authenticated, service_role;
grant execute on function public.clutch_call_context_v1(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Result reveal consumes the same server grade contract.
-- ---------------------------------------------------------------------------

create or replace function public.clutch_prochain_resultat_a_reveler()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with cible as (
    select
      p.*,
      m.equipe_a,
      m.equipe_b,
      m.tag_a,
      m.tag_b,
      m.score_a,
      m.score_b,
      m.jeu,
      m.evenement,
      m.format,
      m.debut
    from public.pronostics_classes p
    join public.v_matchs m on m.id = p.match_id
    where p.user_id = (select auth.uid())
      and p.statut in ('gagne', 'perdu')
      and p.revele_le is null
    order by p.regle_le asc nulls last, p.cree_le asc, p.id asc
    limit 1
  ), contexte as (
    select
      c.*,
      (
        select count(*)::integer
        from public.pronostics_classes h
        where h.user_id = c.user_id
          and h.saison_id = c.saison_id
          and h.statut in ('gagne', 'perdu')
          and (h.regle_le, h.cree_le, h.id) < (c.regle_le, c.cree_le, c.id)
      ) as verdicts_avant
    from cible c
  ), compteur as (
    select count(*)::integer as total
    from public.pronostics_classes p
    where p.user_id = (select auth.uid())
      and p.statut in ('gagne', 'perdu')
      and p.revele_le is null
  )
  select case when c.id is null then null else jsonb_build_object(
    'id', c.id,
    'match_id', c.match_id,
    'saison_id', c.saison_id,
    'statut', c.statut,
    'choix', c.choix,
    'conviction', c.conviction,
    'multiplicateur_conviction', c.multiplicateur_conviction,
    'proba_figee', c.proba_figee,
    'delta_frags', c.delta_frags,
    'frags_avant', c.frags_avant,
    'frags_apres', c.frags_apres,
    'rang_avant', case when c.verdicts_avant >= public.clutch_frags_nb_placements() then c.rang_avant end,
    'rang_apres', case when c.verdicts_avant + 1 >= public.clutch_frags_nb_placements() then c.rang_apres end,
    'verdicts_avant', c.verdicts_avant,
    'verdicts_apres', c.verdicts_avant + 1,
    'grade_avant', public.clutch_grade_frags_v1(coalesce(c.frags_avant, public.clutch_frags_initial()), c.verdicts_avant),
    'grade_apres', public.clutch_grade_frags_v1(coalesce(c.frags_apres, public.clutch_frags_initial()), c.verdicts_avant + 1),
    'objectif_placements', public.clutch_frags_nb_placements(),
    'regle_le', c.regle_le,
    'revele_le', c.revele_le,
    'equipe_a', c.equipe_a,
    'equipe_b', c.equipe_b,
    'tag_a', c.tag_a,
    'tag_b', c.tag_b,
    'score_a', c.score_a,
    'score_b', c.score_b,
    'jeu', c.jeu,
    'evenement', c.evenement,
    'format', c.format,
    'debut', c.debut,
    'regle_resolution', jsonb_build_object(
      'cle', 'vainqueur_match',
      'libelle', 'Vainqueur de la série',
      'detail', 'Le call est réussi si l’équipe choisie remporte le score final de la série.'
    ),
    'source_resultat', 'validation_clutch',
    'source_resultat_label', 'Validation Clutch',
    'restants', compteur.total
  ) end
  from compteur
  left join contexte c on true
$$;

create or replace function public.clutch_resultat_match_v1(p_match_id text)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', p.id,
    'match_id', p.match_id,
    'saison_id', p.saison_id,
    'statut', p.statut,
    'choix', p.choix,
    'conviction', p.conviction,
    'multiplicateur_conviction', p.multiplicateur_conviction,
    'proba_figee', p.proba_figee,
    'delta_frags', p.delta_frags,
    'frags_avant', p.frags_avant,
    'frags_apres', p.frags_apres,
    'rang_avant', case when historique.verdicts_avant >= public.clutch_frags_nb_placements() then p.rang_avant end,
    'rang_apres', case when historique.verdicts_avant + 1 >= public.clutch_frags_nb_placements() then p.rang_apres end,
    'verdicts_avant', historique.verdicts_avant,
    'verdicts_apres', historique.verdicts_avant + 1,
    'grade_avant', public.clutch_grade_frags_v1(coalesce(p.frags_avant, public.clutch_frags_initial()), historique.verdicts_avant),
    'grade_apres', public.clutch_grade_frags_v1(coalesce(p.frags_apres, public.clutch_frags_initial()), historique.verdicts_avant + 1),
    'objectif_placements', public.clutch_frags_nb_placements(),
    'regle_le', p.regle_le,
    'revele_le', p.revele_le,
    'equipe_a', m.equipe_a,
    'equipe_b', m.equipe_b,
    'tag_a', m.tag_a,
    'tag_b', m.tag_b,
    'score_a', m.score_a,
    'score_b', m.score_b,
    'jeu', m.jeu,
    'evenement', m.evenement,
    'format', m.format,
    'debut', m.debut,
    'regle_resolution', jsonb_build_object(
      'cle', 'vainqueur_match',
      'libelle', 'Vainqueur de la série',
      'detail', 'Le call est réussi si l’équipe choisie remporte le score final de la série.'
    ),
    'source_resultat', 'validation_clutch',
    'source_resultat_label', 'Validation Clutch',
    'restants', 1
  )
  from public.pronostics_classes p
  join public.v_matchs m on m.id = p.match_id
  cross join lateral (
    select count(*)::integer as verdicts_avant
    from public.pronostics_classes h
    where h.user_id = p.user_id
      and h.saison_id = p.saison_id
      and h.statut in ('gagne', 'perdu')
      and (h.regle_le, h.cree_le, h.id) < (p.regle_le, p.cree_le, p.id)
  ) historique
  where p.user_id = (select auth.uid())
    and p.match_id = p_match_id
    and p.statut in ('gagne', 'perdu')
  limit 1
$$;

revoke all privileges on function public.clutch_prochain_resultat_a_reveler()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.clutch_resultat_match_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_prochain_resultat_a_reveler()
  to authenticated, service_role;
grant execute on function public.clutch_resultat_match_v1(text)
  to authenticated, service_role;

-- Migration guardrails: no private helper is callable through the Data API,
-- and every intended public RPC has a deterministic allow-list.
do $$
begin
  if has_function_privilege('authenticated', 'private.clutch_grade_config_v1()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.clutch_grade_ordre_v1(integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.clutch_progression_saison_v1(text,uuid)', 'EXECUTE')
  then
    raise exception 'Lot 1.3 contract failed: a private grade helper is executable by authenticated';
  end if;

  if has_function_privilege('anon', 'public.clutch_mes_calls_v1(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.clutch_call_context_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_mes_calls_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_call_context_v1(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.clutch_etat_frags(text)', 'EXECUTE')
  then
    raise exception 'Lots 1.2/1.3 contract failed: public RPC privileges are invalid';
  end if;
end;
$$;
