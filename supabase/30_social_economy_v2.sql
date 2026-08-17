-- Clutch Phase 2 — Social / Faction Economy V2 alignment
-- Frags remain competitive rating only. Faction mutations now reward Volts.

alter table public.volts_mouvements
  drop constraint if exists volts_mouvements_origine_check;
alter table public.volts_mouvements
  add constraint volts_mouvements_origine_check
  check (origine in ('badge','saison','call','achat','ajustement','pari','faction'));

alter table public.communaute_mutations
  add column if not exists recompense_volts integer not null default 0
  check (recompense_volts >= 0);

comment on column public.communaute_mutations.recompense_frags is
  'Legacy archive only. Economy V2 never credits ranking Frags from faction mutations.';
comment on column public.communaute_mutations.recompense_volts is
  'Economy V2 cosmetic-currency reward granted to members present at mutation time.';

create or replace function public.clutch_evaluer_mutation(p_equipe_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_membres integer;
  v_cible smallint;
  v_courant smallint;
  v_niveau integer;
  v_nom text;
  v_seuil integer;
  v_recompense_volts integer;
  r record;
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
    into v_nom, v_seuil, v_recompense_volts;

    insert into public.communaute_mutations(
      equipe_id, niveau, nom, seuil, recompense_frags, recompense_volts, membres_au_moment
    ) values (
      p_equipe_id, v_niveau, v_nom, v_seuil, 0, v_recompense_volts, v_membres
    )
    on conflict (equipe_id, niveau) do nothing;

    for r in
      select p.id
      from public.profils p
      where p.equipe_favorite_id = p_equipe_id
    loop
      perform public.clutch_crediter_volts(
        r.id,
        v_recompense_volts,
        'faction',
        p_equipe_id || ':mutation:' || v_niveau::text
      );
    end loop;

    update public.communaute_etat
    set niveau_atteint = v_niveau::smallint,
        atteint_le = now(),
        maj_le = now()
    where equipe_id = p_equipe_id;
  end loop;
end;
$$;
revoke all on function public.clutch_evaluer_mutation(text) from public, anon, authenticated;

create or replace function public.clutch_classement(p_ids uuid[], p_saison_id text)
returns table(
  id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean,
  tag_favori text, equipe_favorite text, mises bigint, gains bigint,
  roi numeric, note integer, note_paris integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    pr.id,
    pr.pseudo,
    coalesce(c.frags, 1000)::integer as solde,
    coalesce(c.pronostics_regles, 0)::bigint as paris,
    coalesce(c.pronostics_gagnes, 0)::bigint as gagnes,
    pr.id = auth.uid() as moi,
    ef.tag as tag_favori,
    ef.nom as equipe_favorite,
    0::bigint as mises,
    coalesce((
      select sum(pc.delta_frags)::bigint
      from public.pronostics_classes pc
      where pc.user_id = pr.id
        and pc.saison_id = p_saison_id
        and pc.statut in ('gagne','perdu')
    ), 0::bigint) as gains,
    0::numeric as roi,
    pr.note,
    pr.note_paris
  from public.profils pr
  left join public.classements_frags c
    on c.user_id = pr.id and c.saison_id = p_saison_id
  left join public.equipes ef on ef.id = pr.equipe_favorite_id
  where pr.id = any (p_ids)
  order by coalesce(c.frags, 1000) desc, coalesce(c.pronostics_gagnes, 0) desc, pr.pseudo asc;
$$;
revoke execute on function public.clutch_classement(uuid[], text) from public, anon, authenticated;

create or replace function public.clutch_mes_amis(p_saison_id text default null)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_moi uuid := auth.uid();
  v_saison text := coalesce(p_saison_id, (select id from public.v_saisons where statut = 'en_cours' order by debut desc limit 1));
  v_amis uuid[];
begin
  if v_moi is null then
    return json_build_object('amis', '[]'::json, 'recues', '[]'::json, 'envoyees', '[]'::json);
  end if;

  select coalesce(array_agg(case when a = v_moi then b else a end), '{}')
  into v_amis
  from public.amities
  where statut = 'acceptee' and (a = v_moi or b = v_moi);

  return json_build_object(
    'saison', v_saison,
    'amis', coalesce((
      select json_agg(to_jsonb(c) order by c.solde desc)
      from public.clutch_classement(v_amis, v_saison) c
    ), '[]'::json),
    'recues', coalesce((
      select json_agg(json_build_object('id', p.id, 'pseudo', p.pseudo, 'depuis', am.cree_le) order by am.cree_le)
      from public.amities am
      join public.profils p on p.id = am.demandeur
      where am.statut = 'en_attente'
        and am.demandeur <> v_moi
        and (am.a = v_moi or am.b = v_moi)
    ), '[]'::json),
    'envoyees', coalesce((
      select json_agg(json_build_object('id', p.id, 'pseudo', p.pseudo, 'depuis', am.cree_le) order by am.cree_le)
      from public.amities am
      join public.profils p on p.id = case when am.a = v_moi then am.b else am.a end
      where am.statut = 'en_attente'
        and am.demandeur = v_moi
        and (am.a = v_moi or am.b = v_moi)
    ), '[]'::json)
  );
end;
$$;
revoke execute on function public.clutch_mes_amis(text) from public, anon;
grant execute on function public.clutch_mes_amis(text) to authenticated;

create or replace function public.clutch_activite_amis(p_saison_id text default null, p_limite integer default 20)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_moi uuid := auth.uid();
  v_saison text := coalesce(p_saison_id, (select id from public.v_saisons where statut = 'en_cours' order by debut desc limit 1));
  v_amis uuid[];
begin
  if v_moi is null then return '[]'::json; end if;

  select coalesce(array_agg(case when a = v_moi then b else a end), '{}')
  into v_amis
  from public.amities
  where statut = 'acceptee' and (a = v_moi or b = v_moi);

  return coalesce((
    select json_agg(x order by x.quand desc)
    from (
      select
        pr.pseudo,
        pc.choix,
        pc.statut,
        pc.delta_frags,
        pc.proba_figee,
        ea.nom as equipe_a,
        eb.nom as equipe_b,
        m.jeu,
        pc.regle_le as quand
      from public.pronostics_classes pc
      join public.profils pr on pr.id = pc.user_id
      join public.matchs m on m.id = pc.match_id
      join public.equipes ea on ea.id = m.equipe_a_id
      join public.equipes eb on eb.id = m.equipe_b_id
      where pc.user_id = any (v_amis)
        and pc.saison_id = v_saison
        and pc.statut in ('gagne','perdu')
      order by pc.regle_le desc nulls last, pc.cree_le desc
      limit greatest(1, least(p_limite, 50))
    ) x
  ), '[]'::json);
end;
$$;
revoke execute on function public.clutch_activite_amis(text, integer) from public, anon;
grant execute on function public.clutch_activite_amis(text, integer) to authenticated;

create or replace function public.classement_communautes()
returns table (
  equipe_id text,
  nom text,
  tag text,
  jeu text,
  elo integer,
  logo text,
  membres bigint,
  moi boolean,
  niveau_atteint smallint,
  croissance_24h integer,
  croissance_7j integer,
  membre_depuis timestamptz,
  pronos_depuis bigint,
  mutations_vecues bigint,
  dernier_evenement_id bigint,
  dernier_evenement_niveau smallint,
  dernier_evenement_nom text,
  dernier_evenement_le timestamptz,
  dernier_evenement_recompense integer,
  historique jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
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
    select p.id, p.equipe_favorite_id, coalesce(p.equipe_favorite_rejointe_le, p.cree_le) as membre_depuis
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
      from public.pronostics_classes pc
      where pc.user_id = mp.id and pc.cree_le >= mp.membre_depuis
    ) else 0 end,
    case when mp.equipe_favorite_id = e.id then (
      select count(*)
      from public.communaute_mutations cmv
      where cmv.equipe_id = e.id and cmv.cree_le >= mp.membre_depuis
    ) else 0 end,
    last_mut.id,
    last_mut.niveau,
    last_mut.nom,
    last_mut.cree_le,
    coalesce(last_mut.recompense_volts, 0),
    coalesce(hist.items, '[]'::jsonb)
  from public.equipes e
  join effectifs ef on ef.equipe_id = e.id
  left join public.communaute_etat ce on ce.equipe_id = e.id
  left join croissance c on c.equipe_id = e.id
  left join mon_profil mp on mp.equipe_favorite_id = e.id
  left join lateral (
    select cm.id, cm.niveau, cm.nom, cm.cree_le, cm.recompense_volts
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
        'recompense_volts', x.recompense_volts,
        'membres', x.membres_au_moment,
        'cree_le', x.cree_le
      ) order by x.cree_le desc
    ) as items
    from (
      select * from public.communaute_mutations cm2
      where cm2.equipe_id = e.id
      order by cm2.cree_le desc
      limit 5
    ) x
  ) hist on true
  where ef.membres > 0
  order by coalesce(c.croissance_24h, 0) desc,
           coalesce(c.croissance_7j, 0) desc,
           ef.membres desc,
           e.nom asc;
$$;
revoke all on function public.classement_communautes() from public;
grant execute on function public.classement_communautes() to anon, authenticated;
