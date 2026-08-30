-- Synchronisation PandaScore sur le plan gratuit Fixtures.
--
-- Le token PandaScore reste un secret Edge Function. Cette migration ajoute
-- uniquement le contrat d'import service_role, un secret interne distinct pour
-- pg_cron et une cadence prudente de neuf requetes toutes les dix minutes.

-- Rocket League utilise regulierement des BO7. Les regles de resultat sont deja
-- generiques (ceil(format / 2)); seul le domaine de la colonne etait restrictif.
alter table public.matchs
  drop constraint if exists matchs_format_check;

alter table public.matchs
  add constraint matchs_format_check
  check (format in (1, 3, 5, 7)) not valid;

alter table public.matchs validate constraint matchs_format_check;

-- Les RPC administratives sont aussi le chemin canonique des automatismes
-- serveur. Elles restent refusees aux clients ordinaires et acceptent desormais
-- explicitement un JWT service_role signe par Supabase.
create or replace function private.clutch_exiger_admin_v1()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if v_role = 'service_role' then
    return null;
  end if;

  if v_user is null or not exists (
    select 1
    from public.profils p
    where p.id = v_user and p.est_admin
  ) then
    raise exception 'Reserve aux administrateurs.' using errcode = '42501';
  end if;

  return v_user;
end;
$$;

revoke all privileges on function private.clutch_exiger_admin_v1()
  from public, anon, authenticated, service_role;

-- Le payload est normalise dans l'Edge Function. La base recalcule neanmoins
-- tous les identifiants, valide les valeurs et applique les transitions via les
-- RPC auditees existantes. Une erreur sur une affiche ne bloque pas le lot.
create or replace function public.clutch_pandascore_importer_lot_v1(
  p_matchs jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_external_match_id text;
  v_match_id text;
  v_jeu text;
  v_statut_source text;
  v_debut timestamptz;
  v_format integer;
  v_saison_id text;
  v_event_external_id text;
  v_event_id text;
  v_event_nom text;
  v_team_a_external_id text;
  v_team_a_id text;
  v_team_a_nom text;
  v_team_a_tag text;
  v_team_a_logo text;
  v_team_b_external_id text;
  v_team_b_id text;
  v_team_b_nom text;
  v_team_b_tag text;
  v_team_b_logo text;
  v_score_a integer;
  v_score_b integer;
  v_recu_le timestamptz;
  v_match public.matchs%rowtype;
  v_avant public.matchs%rowtype;
  v_apres public.matchs%rowtype;
  v_reference_resultat text;
  v_crees integer := 0;
  v_mis_a_jour integer := 0;
  v_demarres integer := 0;
  v_regles integer := 0;
  v_corriges integer := 0;
  v_annules integer := 0;
  v_inchanges integer := 0;
  v_ignores integer := 0;
  v_erreurs integer := 0;
  v_details jsonb := '[]'::jsonb;
  v_change boolean;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role requis' using errcode = '42501';
  end if;

  if jsonb_typeof(p_matchs) <> 'array' then
    raise exception 'Le lot PandaScore doit etre un tableau JSON.'
      using errcode = '22023';
  end if;
  if jsonb_array_length(p_matchs) > 300 then
    raise exception 'Un lot PandaScore est limite a 300 matchs.'
      using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_matchs)
  loop
    v_external_match_id := null;

    begin
      if jsonb_typeof(v_item) <> 'object' then
        raise exception 'Une entree PandaScore doit etre un objet.';
      end if;

      v_external_match_id := trim(coalesce(v_item ->> 'external_match_id', ''));
      v_jeu := trim(coalesce(v_item ->> 'game', ''));
      v_statut_source := trim(coalesce(v_item ->> 'status', ''));
      v_debut := nullif(v_item ->> 'begin_at', '')::timestamptz;
      v_format := nullif(v_item ->> 'format', '')::integer;
      v_event_external_id := trim(coalesce(v_item ->> 'event_external_id', ''));
      v_event_nom := left(trim(coalesce(v_item ->> 'event_name', '')), 100);
      v_team_a_external_id := trim(coalesce(v_item ->> 'team_a_external_id', ''));
      v_team_a_nom := left(trim(coalesce(v_item ->> 'team_a_name', '')), 80);
      v_team_a_tag := left(upper(trim(coalesce(v_item ->> 'team_a_tag', ''))), 8);
      v_team_a_logo := nullif(left(trim(coalesce(v_item ->> 'team_a_logo', '')), 500), '');
      v_team_b_external_id := trim(coalesce(v_item ->> 'team_b_external_id', ''));
      v_team_b_nom := left(trim(coalesce(v_item ->> 'team_b_name', '')), 80);
      v_team_b_tag := left(upper(trim(coalesce(v_item ->> 'team_b_tag', ''))), 8);
      v_team_b_logo := nullif(left(trim(coalesce(v_item ->> 'team_b_logo', '')), 500), '');
      v_score_a := nullif(v_item ->> 'score_a', '')::integer;
      v_score_b := nullif(v_item ->> 'score_b', '')::integer;
      v_recu_le := least(
        coalesce(nullif(v_item ->> 'received_at', '')::timestamptz, now()),
        now()
      );

      if v_external_match_id !~ '^[0-9]{1,30}$' then
        raise exception 'Identifiant de match PandaScore invalide.';
      end if;
      if v_jeu not in ('lol', 'rocket_league', 'valorant') then
        raise exception 'Jeu PandaScore non pris en charge: %.', v_jeu;
      end if;
      if v_statut_source not in ('not_started', 'running', 'finished', 'canceled', 'postponed') then
        raise exception 'Statut PandaScore non pris en charge: %.', v_statut_source;
      end if;
      if v_debut is null then
        raise exception 'Date de debut PandaScore absente.';
      end if;
      if v_format is null or v_format not in (1, 3, 5, 7) then
        raise exception 'Format BO% non pris en charge.', coalesce(v_format, 0);
      end if;
      if v_event_external_id !~ '^(tournament|league):[0-9]{1,30}$'
         or v_event_nom = '' then
        raise exception 'Evenement PandaScore incomplet.';
      end if;
      if v_team_a_external_id !~ '^[0-9]{1,30}$'
         or v_team_b_external_id !~ '^[0-9]{1,30}$'
         or v_team_a_external_id = v_team_b_external_id
         or v_team_a_nom = ''
         or v_team_b_nom = ''
         or char_length(v_team_a_tag) < 2
         or char_length(v_team_b_tag) < 2 then
        raise exception 'Participants PandaScore incomplets.';
      end if;
      if v_team_a_logo is not null and v_team_a_logo !~ '^https://' then
        v_team_a_logo := null;
      end if;
      if v_team_b_logo is not null and v_team_b_logo !~ '^https://' then
        v_team_b_logo := null;
      end if;

      select s.id into v_saison_id
      from public.saisons s
      where v_debut >= s.debut and v_debut < s.fin
      order by s.debut desc
      limit 1;

      if not found then
        v_ignores := v_ignores + 1;
        if jsonb_array_length(v_details) < 25 then
          v_details := v_details || jsonb_build_array(jsonb_build_object(
            'external_match_id', v_external_match_id,
            'reason', 'hors_saison_clutch'
          ));
        end if;
        continue;
      end if;

      v_match_id := 'ps-match-' || v_external_match_id;
      v_event_id := 'ps-event-' || replace(v_event_external_id, ':', '-');
      v_team_a_id := 'ps-team-' || v_team_a_external_id;
      v_team_b_id := 'ps-team-' || v_team_b_external_id;
      v_reference_resultat := 'match:' || v_external_match_id;

      if exists (
        select 1 from public.equipes e
        where e.id in (v_team_a_id, v_team_b_id) and e.jeu <> v_jeu
      ) then
        raise exception 'Une equipe PandaScore est deja rattachee a un autre jeu.';
      end if;
      if exists (
        select 1 from public.evenements e
        where e.id = v_event_id and e.jeu <> v_jeu
      ) then
        raise exception 'Un evenement PandaScore est deja rattache a un autre jeu.';
      end if;

      insert into public.equipes (id, jeu, nom, tag, elo, logo)
      values (v_team_a_id, v_jeu, v_team_a_nom, v_team_a_tag, 1500, v_team_a_logo)
      on conflict (id) do update set
        nom = excluded.nom,
        tag = excluded.tag,
        logo = coalesce(excluded.logo, public.equipes.logo);

      insert into public.equipes (id, jeu, nom, tag, elo, logo)
      values (v_team_b_id, v_jeu, v_team_b_nom, v_team_b_tag, 1500, v_team_b_logo)
      on conflict (id) do update set
        nom = excluded.nom,
        tag = excluded.tag,
        logo = coalesce(excluded.logo, public.equipes.logo);

      insert into public.evenements (id, jeu, nom, tier)
      values (v_event_id, v_jeu, v_event_nom, 'A')
      on conflict (id) do update set nom = excluded.nom;

      select * into v_match
      from public.matchs m
      where m.id = v_match_id
      for update;

      if not found then
        insert into public.matchs (
          id,
          event_id,
          saison_id,
          jeu,
          equipe_a_id,
          equipe_b_id,
          format,
          debut,
          statut
        )
        values (
          v_match_id,
          v_event_id,
          v_saison_id,
          v_jeu,
          v_team_a_id,
          v_team_b_id,
          v_format,
          v_debut,
          'a_venir'
        );
        v_crees := v_crees + 1;
        select * into v_match from public.matchs where id = v_match_id;
      end if;

      if v_match.jeu <> v_jeu or v_match.saison_id <> v_saison_id then
        raise exception 'Le match PandaScore existe avec un jeu ou une saison differente.';
      end if;

      if v_match.statut = 'a_venir' then
        v_change := v_match.event_id is distinct from v_event_id
          or v_match.equipe_a_id is distinct from v_team_a_id
          or v_match.equipe_b_id is distinct from v_team_b_id
          or v_match.format is distinct from v_format
          or v_match.debut is distinct from v_debut;

        if v_change then
          v_avant := v_match;
          update public.matchs
          set event_id = v_event_id,
              equipe_a_id = v_team_a_id,
              equipe_b_id = v_team_b_id,
              format = v_format,
              debut = v_debut
          where id = v_match_id
          returning * into v_match;
          v_mis_a_jour := v_mis_a_jour + 1;

          if v_avant.debut is distinct from v_match.debut then
            perform private.clutch_auditer_match_v1(
              v_match_id,
              'report',
              to_jsonb(v_avant),
              to_jsonb(v_match),
              'pandascore',
              v_reference_resultat,
              'Horaire synchronise automatiquement depuis PandaScore.',
              v_match.resultat_revision
            );
          end if;
        end if;
      elsif v_match.equipe_a_id <> v_team_a_id
         or v_match.equipe_b_id <> v_team_b_id
         or v_match.format <> v_format then
        raise exception 'Participants ou format modifies apres verrouillage du match.';
      end if;

      if v_statut_source in ('not_started', 'postponed') then
        v_inchanges := v_inchanges + 1;
        continue;
      end if;

      if v_statut_source = 'canceled' then
        if v_match.statut in ('a_venir', 'en_cours') then
          perform public.annuler_match(
            v_match_id,
            'Annulation signalee par PandaScore.'
          );
          v_annules := v_annules + 1;
        else
          v_inchanges := v_inchanges + 1;
        end if;
        continue;
      end if;

      if v_statut_source = 'running' then
        if v_match.statut = 'a_venir' then
          perform public.clutch_admin_demarrer_match_v1(v_match_id);
          v_demarres := v_demarres + 1;
        else
          v_inchanges := v_inchanges + 1;
        end if;
        continue;
      end if;

      -- Un resultat incomplet ne verrouille jamais le match. Le prochain cycle
      -- le reprendra lorsque PandaScore aura publie le score de serie valide.
      if v_score_a is null
         or v_score_b is null
         or v_score_a < 0
         or v_score_b < 0
         or v_score_a = v_score_b
         or greatest(v_score_a, v_score_b) <> ceil(v_format / 2.0) then
        v_ignores := v_ignores + 1;
        if jsonb_array_length(v_details) < 25 then
          v_details := v_details || jsonb_build_array(jsonb_build_object(
            'external_match_id', v_external_match_id,
            'reason', 'resultat_incomplet_ou_invalide'
          ));
        end if;
        continue;
      end if;

      select * into v_match from public.matchs where id = v_match_id for update;

      if v_match.statut = 'a_venir' then
        perform public.clutch_admin_demarrer_match_v1(v_match_id);
        v_demarres := v_demarres + 1;
        select * into v_match from public.matchs where id = v_match_id for update;
      end if;

      if v_match.statut = 'en_cours' then
        perform public.clutch_admin_regler_match_v1(
          v_match_id,
          v_score_a,
          v_score_b,
          'pandascore',
          v_reference_resultat,
          'PandaScore',
          v_recu_le
        );
        v_regles := v_regles + 1;
      elsif v_match.statut = 'termine' then
        if v_match.score_a = v_score_a and v_match.score_b = v_score_b then
          v_inchanges := v_inchanges + 1;
        elsif v_match.resultat_source = 'pandascore' then
          perform public.clutch_admin_corriger_resultat_v1(
            v_match_id,
            v_score_a,
            v_score_b,
            'pandascore',
            v_reference_resultat,
            'Correction automatique recue de PandaScore.',
            'PandaScore',
            v_recu_le
          );
          v_corriges := v_corriges + 1;
        else
          v_ignores := v_ignores + 1;
          if jsonb_array_length(v_details) < 25 then
            v_details := v_details || jsonb_build_array(jsonb_build_object(
              'external_match_id', v_external_match_id,
              'reason', 'conflit_avec_resultat_non_pandascore'
            ));
          end if;
        end if;
      else
        v_inchanges := v_inchanges + 1;
      end if;
    exception when others then
      v_erreurs := v_erreurs + 1;
      if jsonb_array_length(v_details) < 25 then
        v_details := v_details || jsonb_build_array(jsonb_build_object(
          'external_match_id', v_external_match_id,
          'reason', 'erreur_import',
          'sqlstate', sqlstate,
          'message', left(sqlerrm, 240)
        ));
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'recus', jsonb_array_length(p_matchs),
    'crees', v_crees,
    'mis_a_jour', v_mis_a_jour,
    'demarres', v_demarres,
    'regles', v_regles,
    'corriges', v_corriges,
    'annules', v_annules,
    'inchanges', v_inchanges,
    'ignores', v_ignores,
    'erreurs', v_erreurs,
    'details', v_details
  );
end;
$$;

revoke all privileges on function public.clutch_pandascore_importer_lot_v1(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_pandascore_importer_lot_v1(jsonb)
  to service_role;

comment on function public.clutch_pandascore_importer_lot_v1(jsonb) is
  'Import PandaScore service_role-only: affiches, transitions, resultats et corrections auditees.';

-- Secret interne pg_cron -> Edge Function. Le token PandaScore n'est jamais
-- stocke en base et sera configure avec `supabase secrets set`.
create table if not exists private.clutch_pandascore_configuration (
  id smallint primary key default 1 check (id = 1),
  secret_hash bytea not null,
  rotation_le timestamptz not null default now()
);

alter table private.clutch_pandascore_configuration enable row level security;
revoke all privileges on table private.clutch_pandascore_configuration
  from public, anon, authenticated, service_role;

create or replace function public.clutch_verifier_secret_pandascore_v1(
  p_secret text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role requis' using errcode = '42501';
  end if;

  return exists (
    select 1
    from private.clutch_pandascore_configuration c
    where c.id = 1
      and c.secret_hash = extensions.digest(coalesce(p_secret, ''), 'sha256')
  );
end;
$$;

revoke all privileges on function public.clutch_verifier_secret_pandascore_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.clutch_verifier_secret_pandascore_v1(text)
  to service_role;

do $$
declare
  v_secret text := encode(extensions.gen_random_bytes(32), 'hex');
  v_secret_id uuid;
begin
  insert into private.clutch_pandascore_configuration(id, secret_hash, rotation_le)
  values (1, extensions.digest(v_secret, 'sha256'), now())
  on conflict (id) do update set
    secret_hash = excluded.secret_hash,
    rotation_le = excluded.rotation_le;

  select id into v_secret_id
  from vault.secrets
  where name = 'clutch_pandascore_cron_secret'
  order by created_at desc
  limit 1;

  if v_secret_id is null then
    perform vault.create_secret(
      v_secret,
      'clutch_pandascore_cron_secret',
      'Authentification interne de la synchronisation PandaScore Clutch'
    );
  else
    perform vault.update_secret(
      v_secret_id,
      v_secret,
      'clutch_pandascore_cron_secret',
      'Authentification interne de la synchronisation PandaScore Clutch'
    );
  end if;
end;
$$;

create or replace function private.clutch_cycle_pandascore_v1()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_cle text;
  v_cron_secret text;
  v_requete bigint;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'clutch_project_url'
  order by created_at desc limit 1;

  select decrypted_secret into v_cle
  from vault.decrypted_secrets
  where name = 'clutch_anon_key'
  order by created_at desc limit 1;

  select decrypted_secret into v_cron_secret
  from vault.decrypted_secrets
  where name = 'clutch_pandascore_cron_secret'
  order by created_at desc limit 1;

  if coalesce(v_url, '') = ''
     or coalesce(v_cle, '') = ''
     or coalesce(v_cron_secret, '') = '' then
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/clutch-pandascore-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cle,
      'apikey', v_cle,
      'X-Clutch-Cron-Secret', v_cron_secret
    ),
    body := jsonb_build_object('source', 'pg_cron', 'at', now()),
    timeout_milliseconds := 55000
  ) into v_requete;

  return v_requete;
end;
$$;

revoke all privileges on function private.clutch_cycle_pandascore_v1()
  from public, anon, authenticated, service_role;

do $$
declare
  v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname = 'clutch-pandascore-sync-10m'
  loop
    perform cron.unschedule(v_jobid);
  end loop;

  perform cron.schedule(
    'clutch-pandascore-sync-10m',
    '*/10 * * * *',
    'select private.clutch_cycle_pandascore_v1()'
  );
end;
$$;
