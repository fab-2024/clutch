-- =====================================================================
-- Clutch — Phase 5 / Flow de pronostic + conviction
--
-- Migration additive au-dessus de 18_economie_v2.sql.
-- Les Frags restent un rating non dépensable. La conviction ne retire aucun
-- Frag : elle module uniquement le K utilisé au règlement du pronostic.
--
-- Faible = 0.75x · Normal = 1.00x · Fort = 1.50x
-- =====================================================================

alter table public.pronostics_classes
  add column if not exists conviction text not null default 'normal';

alter table public.pronostics_classes
  add column if not exists multiplicateur_conviction numeric(4,2) not null default 1.00;

update public.pronostics_classes
set conviction = 'normal'
where conviction is null or conviction not in ('faible','normal','fort');

update public.pronostics_classes
set multiplicateur_conviction = case conviction
  when 'faible' then 0.75
  when 'fort' then 1.50
  else 1.00
end;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pronostics_classes_conviction_check'
      and conrelid = 'public.pronostics_classes'::regclass
  ) then
    alter table public.pronostics_classes
      add constraint pronostics_classes_conviction_check
      check (conviction in ('faible','normal','fort'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pronostics_classes_conviction_mult_check'
      and conrelid = 'public.pronostics_classes'::regclass
  ) then
    alter table public.pronostics_classes
      add constraint pronostics_classes_conviction_mult_check
      check (multiplicateur_conviction in (0.75,1.00,1.50));
  end if;
end $$;

create or replace function public.clutch_conviction_multiplier(p_conviction text)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_conviction text := lower(trim(coalesce(p_conviction,'')));
begin
  case v_conviction
    when 'faible' then return 0.75::numeric;
    when 'normal' then return 1.00::numeric;
    when 'fort' then return 1.50::numeric;
    else
      raise exception 'Conviction invalide : %', p_conviction using errcode = '22023';
  end case;
end;
$$;

create or replace function public.clutch_k_conviction(p_k integer,p_conviction text)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_k integer;
begin
  if p_k is null or p_k <= 0 then
    raise exception 'Coefficient K invalide : %', p_k using errcode = '22023';
  end if;
  v_k := round(p_k * clutch_conviction_multiplier(p_conviction))::integer;
  return greatest(1,v_k);
end;
$$;

create or replace function public.clutch_delta_frags_conviction(
  p_proba numeric,
  p_gagnant boolean,
  p_k integer,
  p_conviction text
)
returns integer
language sql
immutable
set search_path = public
as $$
  select public.clutch_delta_frags(
    p_proba,
    p_gagnant,
    public.clutch_k_conviction(p_k,p_conviction)
  )
$$;

create or replace function public.clutch_projection_convictions_json(p_proba numeric,p_k integer)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'faible', jsonb_build_object(
      'multiplicateur', public.clutch_conviction_multiplier('faible'),
      'k_effectif', public.clutch_k_conviction(p_k,'faible'),
      'gain', public.clutch_delta_frags_conviction(p_proba,true,p_k,'faible'),
      'perte', public.clutch_delta_frags_conviction(p_proba,false,p_k,'faible')
    ),
    'normal', jsonb_build_object(
      'multiplicateur', public.clutch_conviction_multiplier('normal'),
      'k_effectif', public.clutch_k_conviction(p_k,'normal'),
      'gain', public.clutch_delta_frags_conviction(p_proba,true,p_k,'normal'),
      'perte', public.clutch_delta_frags_conviction(p_proba,false,p_k,'normal')
    ),
    'fort', jsonb_build_object(
      'multiplicateur', public.clutch_conviction_multiplier('fort'),
      'k_effectif', public.clutch_k_conviction(p_k,'fort'),
      'gain', public.clutch_delta_frags_conviction(p_proba,true,p_k,'fort'),
      'perte', public.clutch_delta_frags_conviction(p_proba,false,p_k,'fort')
    )
  )
$$;

-- Même projection que Economy V2, enrichie des trois convictions.
create or replace function public.clutch_projection_match_frags_v2(p_match_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base jsonb;
  v_k integer;
  v_choix jsonb;
begin
  v_base := public.clutch_projection_match_frags(p_match_id);
  v_k := (v_base ->> 'k')::integer;

  select jsonb_agg(
    c || jsonb_build_object(
      'convictions',
      public.clutch_projection_convictions_json((c ->> 'proba_scoring')::numeric,v_k)
    )
    order by ord
  )
  into v_choix
  from jsonb_array_elements(v_base -> 'choix') with ordinality as x(c,ord);

  return jsonb_set(v_base,'{choix}',coalesce(v_choix,'[]'::jsonb),true);
end;
$$;

-- RPC Phase 5. L'ancien placer_pronostic_classe(text,text) reste intact pour
-- compatibilité et enregistre implicitement une conviction Normal.
create or replace function public.placer_pronostic_classe_v2(
  p_match_id text,
  p_choix text,
  p_conviction text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conviction text := lower(trim(coalesce(p_conviction,'')));
  v_mult numeric;
  v_result jsonb;
  v_id uuid;
  v_scoring numeric;
  v_k integer;
begin
  v_mult := public.clutch_conviction_multiplier(v_conviction);

  -- On réutilise volontairement l'autorité Economy V2 pour toutes les règles :
  -- auth, saison, fermeture, lock, unicité, snapshot et K de placement.
  v_result := public.placer_pronostic_classe(p_match_id,p_choix);
  v_id := (v_result ->> 'id')::uuid;

  update public.pronostics_classes
  set conviction = v_conviction,
      multiplicateur_conviction = v_mult
  where id = v_id
    and user_id = auth.uid()
  returning proba_scoring,k_frags into v_scoring,v_k;

  if not found then
    raise exception 'Pronostic classe introuvable apres creation.';
  end if;

  return v_result || jsonb_build_object(
    'conviction', v_conviction,
    'multiplicateur_conviction', v_mult,
    'k_effectif', public.clutch_k_conviction(v_k,v_conviction),
    'gain_si_correct', public.clutch_delta_frags_conviction(v_scoring,true,v_k,v_conviction),
    'perte_si_faux', public.clutch_delta_frags_conviction(v_scoring,false,v_k,v_conviction)
  );
end;
$$;

-- Lecture ciblée utilisée par le Match Center pour réafficher le prono après
-- un refresh sans modifier le RPC historique consommé par les autres écrans.
create or replace function public.clutch_mon_pronostic_match_v2(p_match_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_p public.pronostics_classes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  select * into v_p
  from public.pronostics_classes
  where user_id = auth.uid()
    and match_id = p_match_id
  limit 1;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_p.id,
    'match_id', v_p.match_id,
    'choix', v_p.choix,
    'conviction', v_p.conviction,
    'multiplicateur_conviction', v_p.multiplicateur_conviction,
    'proba_figee', v_p.proba_figee,
    'proba_scoring', v_p.proba_scoring,
    'k_frags', v_p.k_frags,
    'k_effectif', public.clutch_k_conviction(v_p.k_frags,v_p.conviction),
    'statut', v_p.statut,
    'delta_frags', v_p.delta_frags,
    'gain_si_correct', public.clutch_delta_frags_conviction(v_p.proba_scoring,true,v_p.k_frags,v_p.conviction),
    'perte_si_faux', public.clutch_delta_frags_conviction(v_p.proba_scoring,false,v_p.k_frags,v_p.conviction),
    'cree_le', v_p.cree_le,
    'regle_le', v_p.regle_le
  );
end;
$$;

-- Le règlement devient conviction-aware. Les anciens pronostics sont Normal
-- grâce aux defaults/backfills ci-dessus.
create or replace function private.clutch_resoudre_pronostics_classes()
returns trigger
language plpgsql
security definer
set search_path = public,private
as $$
declare
  r public.pronostics_classes%rowtype;
  v_gagnant boolean;
  v_delta integer;
  v_frags_avant integer;
  v_frags_apres integer;
begin
  if new.statut = 'annule' and old.statut is distinct from 'annule' then
    update public.pronostics_classes
    set statut = 'annule',delta_frags = 0,regle_le = now()
    where match_id = new.id and statut = 'en_cours';
    return new;
  end if;

  if new.statut <> 'termine' or old.statut = 'termine' then return new; end if;
  if new.score_a is null or new.score_b is null or new.score_a = new.score_b then
    raise exception 'Impossible de regler les Frags : score final invalide pour %',new.id;
  end if;

  for r in
    select * from public.pronostics_classes
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

    insert into public.classements_frags(saison_id,user_id,frags,pic_frags)
    values(r.saison_id,r.user_id,public.clutch_frags_initial(),public.clutch_frags_initial())
    on conflict(saison_id,user_id) do nothing;

    select frags into v_frags_avant
    from public.classements_frags
    where saison_id = r.saison_id and user_id = r.user_id
    for update;

    v_frags_apres := v_frags_avant + v_delta;

    update public.classements_frags
    set frags = v_frags_apres,
        pic_frags = greatest(pic_frags,v_frags_apres),
        pronostics_regles = pronostics_regles + 1,
        pronostics_gagnes = pronostics_gagnes + case when v_gagnant then 1 else 0 end,
        maj_le = now()
    where saison_id = r.saison_id and user_id = r.user_id;

    update public.pronostics_classes
    set statut = case when v_gagnant then 'gagne' else 'perdu' end,
        delta_frags = v_delta,
        regle_le = now()
    where id = r.id;
  end loop;

  return new;
end;
$$;

revoke all on function private.clutch_resoudre_pronostics_classes() from public;

-- Le trigger existe déjà ; recréation explicite pour rendre la migration
-- autonome si la phase 5 est rejouée sur une base restaurée.
drop trigger if exists frags_regler_pronostics on public.matchs;
create trigger frags_regler_pronostics
after update of statut,score_a,score_b on public.matchs
for each row execute function private.clutch_resoudre_pronostics_classes();

revoke execute on function public.placer_pronostic_classe_v2(text,text,text) from public;
revoke execute on function public.clutch_mon_pronostic_match_v2(text) from public;
revoke execute on function public.clutch_projection_match_frags_v2(text) from public;

revoke execute on function public.placer_pronostic_classe_v2(text,text,text) from anon;
revoke execute on function public.clutch_mon_pronostic_match_v2(text) from anon;

grant execute on function public.clutch_projection_match_frags_v2(text) to anon;
grant execute on function public.clutch_projection_match_frags_v2(text) to authenticated;
grant execute on function public.placer_pronostic_classe_v2(text,text,text) to authenticated;
grant execute on function public.clutch_mon_pronostic_match_v2(text) to authenticated;
