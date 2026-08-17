-- =====================================================================
-- Clutch — 25_frags_search_path_fix.sql
-- Les helpers hardenis avec search_path='' doivent qualifier leurs appels.
-- =====================================================================

create or replace function public.clutch_borner_proba_frags(p_proba numeric)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_proba is null or p_proba <= 0 or p_proba >= 1 then
    raise exception 'probabilite invalide : %',p_proba using errcode='22023';
  end if;
  return least(
    public.clutch_frags_proba_max(),
    greatest(public.clutch_frags_proba_min(),p_proba)
  );
end;
$$;

create or replace function public.clutch_delta_frags(
  p_proba numeric,
  p_gagnant boolean,
  p_k integer default 40
)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_p numeric := public.clutch_borner_proba_frags(p_proba);
begin
  if p_k <= 0 then
    raise exception 'coefficient K invalide : %',p_k using errcode='22023';
  end if;
  if p_gagnant then return round(p_k*(1-v_p))::integer; end if;
  return -round(p_k*v_p)::integer;
end;
$$;
