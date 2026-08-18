-- Phase 12 hardening — correct shared league member count without exposing private league data.
do $$
declare
  v_def text;
  v_old text := $old$
    select jsonb_build_object('id',l.id,'nom',l.nom,'code',l.code,'membres',count(*) over(partition by l.id))
    into v_ligue
    from public.membres_ligue mt
    join public.membres_ligue mv on mv.ligue_id=mt.ligue_id and mv.user_id=v_viewer
    join public.ligues l on l.id=mt.ligue_id
    join public.membres_ligue allm on allm.ligue_id=l.id
    where mt.user_id=v_target.id
    group by l.id,l.nom,l.code,mt.rejoint_le
    order by count(allm.user_id) desc,mt.rejoint_le desc
    limit 1;
$old$;
  v_new text := $new$
    select jsonb_build_object(
      'id',l.id,
      'nom',l.nom,
      'code',l.code,
      'membres',(select count(*) from public.membres_ligue lm_count where lm_count.ligue_id=l.id)
    )
    into v_ligue
    from public.membres_ligue mt
    join public.membres_ligue mv on mv.ligue_id=mt.ligue_id and mv.user_id=v_viewer
    join public.ligues l on l.id=mt.ligue_id
    where mt.user_id=v_target.id
    order by (select count(*) from public.membres_ligue lm_count where lm_count.ligue_id=l.id) desc,mt.rejoint_le desc
    limit 1;
$new$;
begin
  select pg_get_functiondef('public.clutch_profil_public_v1(text)'::regprocedure) into v_def;
  if strpos(v_def,v_old)=0 then
    raise exception 'Phase 12 profile function shape changed; hardening patch not applied';
  end if;
  execute replace(v_def,v_old,v_new);
end $$;
