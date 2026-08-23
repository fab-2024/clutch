-- Visible Clutch -> GRIFF rebrand.
--
-- Historical identifiers, product IDs, RPC names and deep-link compatibility
-- intentionally keep their existing `clutch_*` values. Only copy rendered to
-- supporters or partners changes here.

update public.objets_catalogue
set nom = replace(replace(replace(nom, 'CLUTCH', 'GRIFF'), 'Clutch', 'GRIFF'), 'clutch', 'GRIFF'),
    description = replace(replace(replace(description, 'CLUTCH', 'GRIFF'), 'Clutch', 'GRIFF'), 'clutch', 'GRIFF'),
    licence = case
      when lower(licence ->> 'titulaire') = 'clutch'
        then jsonb_set(licence, '{titulaire}', to_jsonb('GRIFF'::text), true)
      else licence
    end
where nom ilike '%clutch%'
   or description ilike '%clutch%'
   or lower(licence ->> 'titulaire') = 'clutch';

create or replace function private.griff_normaliser_marque_catalogue_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.nom := replace(replace(replace(new.nom, 'CLUTCH', 'GRIFF'), 'Clutch', 'GRIFF'), 'clutch', 'GRIFF');
  new.description := replace(replace(replace(new.description, 'CLUTCH', 'GRIFF'), 'Clutch', 'GRIFF'), 'clutch', 'GRIFF');
  if lower(new.licence ->> 'titulaire') = 'clutch' then
    new.licence := jsonb_set(new.licence, '{titulaire}', to_jsonb('GRIFF'::text), true);
  end if;
  return new;
end;
$$;

revoke all privileges
on function private.griff_normaliser_marque_catalogue_v1()
from public, anon, authenticated, service_role;

drop trigger if exists griff_normaliser_marque_catalogue_v1
on public.objets_catalogue;

create trigger griff_normaliser_marque_catalogue_v1
before insert or update of nom, description, licence
on public.objets_catalogue
for each row execute function private.griff_normaliser_marque_catalogue_v1();

update public.matchs
set resultat_source_label = replace(
      replace(replace(resultat_source_label, 'CLUTCH', 'GRIFF'), 'Clutch', 'GRIFF'),
      'clutch',
      'GRIFF'
    )
where resultat_source_label ilike '%clutch%';

create or replace function private.griff_normaliser_marque_match_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.resultat_source_label := replace(
    replace(replace(new.resultat_source_label, 'CLUTCH', 'GRIFF'), 'Clutch', 'GRIFF'),
    'clutch',
    'GRIFF'
  );
  return new;
end;
$$;

revoke all privileges
on function private.griff_normaliser_marque_match_v1()
from public, anon, authenticated, service_role;

drop trigger if exists griff_normaliser_marque_match_v1
on public.matchs;

create trigger griff_normaliser_marque_match_v1
before insert or update of resultat_source_label
on public.matchs
for each row execute function private.griff_normaliser_marque_match_v1();

update public.evenements_notification
set titre = replace(replace(replace(titre, 'CLUTCH', 'GRIFF'), 'Clutch', 'GRIFF'), 'clutch', 'GRIFF'),
    corps = replace(replace(replace(corps, 'CLUTCH', 'GRIFF'), 'Clutch', 'GRIFF'), 'clutch', 'GRIFF')
where titre ilike '%clutch%'
   or corps ilike '%clutch%';

create or replace function private.griff_normaliser_marque_notification_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.titre := replace(replace(replace(new.titre, 'CLUTCH', 'GRIFF'), 'Clutch', 'GRIFF'), 'clutch', 'GRIFF');
  new.corps := replace(replace(replace(new.corps, 'CLUTCH', 'GRIFF'), 'Clutch', 'GRIFF'), 'clutch', 'GRIFF');
  return new;
end;
$$;

revoke all privileges
on function private.griff_normaliser_marque_notification_v1()
from public, anon, authenticated, service_role;

drop trigger if exists griff_normaliser_marque_notification_v1
on public.evenements_notification;

create trigger griff_normaliser_marque_notification_v1
before insert or update of titre, corps
on public.evenements_notification
for each row execute function private.griff_normaliser_marque_notification_v1();

comment on function private.griff_normaliser_marque_notification_v1() is
  'Keeps notification copy on the GRIFF visible brand while legacy producers are retired.';

do $$
begin
  if exists (
    select 1
    from public.objets_catalogue
    where nom ilike '%clutch%'
       or description ilike '%clutch%'
       or lower(licence ->> 'titulaire') = 'clutch'
  ) then
    raise exception 'Visible cosmetic catalogue branding migration failed';
  end if;

  if exists (
    select 1
    from public.matchs
    where resultat_source_label ilike '%clutch%'
  ) then
    raise exception 'Visible match source branding migration failed';
  end if;

  if exists (
    select 1
    from public.evenements_notification
    where titre ilike '%clutch%'
       or corps ilike '%clutch%'
  ) then
    raise exception 'Visible notification branding migration failed';
  end if;
end;
$$;
