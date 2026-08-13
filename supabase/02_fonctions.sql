-- =====================================================================
--  Clutch — moteur de cotes et logique métier, côté serveur.
--
--  C'est ce fichier qui fait autorité : le navigateur affiche des cotes,
--  mais c'est Postgres qui les recalcule au moment de valider un pari.
--  Miroir de web/js/core.js — si tu modifies l'un, modifie l'autre.
-- =====================================================================

-- Paramètres du jeu, au même endroit que dans core.js
create or replace function clutch_marge()          returns numeric language sql immutable as $$ select 0.06 $$;
create or replace function clutch_cote_min()       returns numeric language sql immutable as $$ select 1.01 $$;
create or replace function clutch_cote_max()       returns numeric language sql immutable as $$ select 50.0 $$;
create or replace function clutch_mise_min()       returns integer language sql immutable as $$ select 10 $$;
create or replace function clutch_mise_max()       returns integer language sql immutable as $$ select 5000 $$;
create or replace function clutch_bonus()          returns integer language sql immutable as $$ select 200 $$;
create or replace function clutch_seuil_faillite() returns integer language sql immutable as $$ select 100 $$;
create or replace function clutch_elo_k()          returns numeric language sql immutable as $$ select 24 $$;

-- ------------------------------------------------- Probabilité d'une map
create or replace function clutch_proba_map(elo_a integer, elo_b integer)
returns numeric language sql immutable as $$
  select least(0.95, greatest(0.05, 1.0 / (1.0 + power(10.0, (elo_b - elo_a) / 400.0))));
$$;

-- ------------------------------------------------- Cote depuis une proba
create or replace function clutch_cote(p numeric)
returns numeric language sql immutable as $$
  select round(
    least(clutch_cote_max(), greatest(clutch_cote_min(), 1.0 / (greatest(p, 0.0000001) * (1 + clutch_marge())))),
    2
  );
$$;

-- ------------------------------- Distribution des scores possibles d'une série
create or replace function clutch_distribution(p numeric, format integer)
returns table (score_a integer, score_b integer, proba numeric)
language plpgsql immutable as $$
declare q numeric := 1 - p;
begin
  if format = 1 then
    return query values (1, 0, p), (0, 1, q);
  elsif format = 3 then
    return query values
      (2, 0, p * p),
      (2, 1, 2 * p * p * q),
      (1, 2, 2 * q * q * p),
      (0, 2, q * q);
  elsif format = 5 then
    return query values
      (3, 0, power(p, 3)),
      (3, 1, 3 * power(p, 3) * q),
      (3, 2, 6 * power(p, 3) * q * q),
      (2, 3, 6 * power(q, 3) * p * p),
      (1, 3, 3 * power(q, 3) * p),
      (0, 3, power(q, 3));
  else
    raise exception 'Format de série non supporté : BO%', format;
  end if;
end;
$$;

-- ------------------------------------------------ Marchés d'un match (JSON)
-- Retourne exactement la structure attendue par web/js/views/match.js.
create or replace function cotes_du_match(p_match_id text)
returns jsonb language plpgsql stable as $$
declare
  m record;
  p numeric;
  p_serie numeric;
  p_court numeric;
  maps_min integer;
  marches jsonb := '[]'::jsonb;
  choix_score jsonb;
begin
  select * into m from v_matchs where id = p_match_id;
  if not found then raise exception 'Match introuvable'; end if;

  p := clutch_proba_map(m.elo_a, m.elo_b);

  -- Marché 1 : vainqueur
  select coalesce(sum(proba), 0) into p_serie
  from clutch_distribution(p, m.format) where score_a > score_b;

  marches := marches || jsonb_build_array(jsonb_build_object(
    'cle', 'vainqueur',
    'libelle', 'Vainqueur du match',
    'aide', 'Qui remporte la série ?',
    'choix', jsonb_build_array(
      jsonb_build_object('cle', 'a', 'libelle', m.equipe_a, 'proba', p_serie,     'cote', clutch_cote(p_serie)),
      jsonb_build_object('cle', 'b', 'libelle', m.equipe_b, 'proba', 1 - p_serie, 'cote', clutch_cote(1 - p_serie))
    )
  ));

  -- Marché 2 : score exact
  select jsonb_agg(jsonb_build_object(
           'cle', score_a || '-' || score_b,
           'libelle', score_a || ' – ' || score_b,
           'proba', proba,
           'cote', clutch_cote(proba)
         ) order by score_a desc, score_b asc)
    into choix_score
  from clutch_distribution(p, m.format);

  marches := marches || jsonb_build_array(jsonb_build_object(
    'cle', 'score_exact',
    'libelle', 'Score exact en maps',
    'aide', 'Le score final de la série, map par map.',
    'choix', choix_score
  ));

  -- Marché 3 : nombre de maps (BO3 et BO5 uniquement)
  if m.format > 1 then
    maps_min := ceil(m.format / 2.0);
    select coalesce(sum(proba), 0) into p_court
    from clutch_distribution(p, m.format) where score_a + score_b <= maps_min;

    marches := marches || jsonb_build_array(jsonb_build_object(
      'cle', 'total_maps',
      'libelle', 'Nombre de maps jouées',
      'aide', 'La série ira-t-elle au-delà de ' || maps_min || ' maps ?',
      'choix', jsonb_build_array(
        jsonb_build_object('cle', 'under', 'libelle', 'Moins de ' || (maps_min + 0.5) || ' maps',
                           'proba', p_court, 'cote', clutch_cote(p_court)),
        jsonb_build_object('cle', 'over', 'libelle', 'Plus de ' || (maps_min + 0.5) || ' maps',
                           'proba', 1 - p_court, 'cote', clutch_cote(1 - p_court))
      )
    ));
  end if;

  return marches;
end;
$$;

-- ------------------------------------------- Participation à une saison
-- Renvoie le solde du joueur pour une saison, en créant la ligne au premier
-- appel. C'est le seul endroit où un solde apparaît de nulle part.
create or replace function clutch_participation(p_user uuid, p_saison text)
returns participations language plpgsql security definer set search_path = public as $$
declare v_part participations%rowtype; v_initial integer;
begin
  select * into v_part from participations where user_id = p_user and saison_id = p_saison for update;
  if found then return v_part; end if;

  select solde_initial into v_initial from saisons where id = p_saison;
  if v_initial is null then raise exception 'Saison inconnue.'; end if;

  insert into participations (saison_id, user_id, solde)
  values (p_saison, p_user, v_initial)
  on conflict (saison_id, user_id) do nothing;

  select * into v_part from participations where user_id = p_user and saison_id = p_saison;
  return v_part;
end;
$$;

-- --------------------------------------------------------- Placer un pari
create or replace function placer_pari(
  p_match_id text, p_marche text, p_choix text, p_mise integer
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user   uuid := auth.uid();
  v_solde  integer;
  m        record;
  marche   jsonb;
  choix    jsonb;
  v_pari   paris%rowtype;
begin
  if v_user is null then raise exception 'Connecte-toi pour miser.'; end if;

  select * into m from matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut <> 'a_venir' then raise exception 'Ce match a déjà commencé.'; end if;
  if m.debut <= now() then raise exception 'Les mises sont fermées sur ce match.'; end if;

  if p_mise < clutch_mise_min() then raise exception 'Mise minimale : % Frags.', clutch_mise_min(); end if;
  if p_mise > clutch_mise_max() then raise exception 'Mise maximale : % Frags.', clutch_mise_max(); end if;

  -- La saison doit être ouverte : on ne mise ni dans le passé ni dans le futur.
  if (select statut from v_saisons where id = m.saison_id) <> 'en_cours' then
    raise exception 'Cette saison n''est pas ouverte aux mises.';
  end if;

  -- Verrou sur la participation : évite qu'un double clic ne dépense deux fois.
  v_solde := (clutch_participation(v_user, m.saison_id)).solde;
  if v_solde < p_mise then raise exception 'Solde insuffisant.'; end if;

  -- La cote est recalculée ici, jamais reprise du navigateur.
  select value into marche
  from jsonb_array_elements(cotes_du_match(p_match_id)) as value
  where value ->> 'cle' = p_marche;
  if marche is null then raise exception 'Marché inconnu.'; end if;

  select value into choix
  from jsonb_array_elements(marche -> 'choix') as value
  where value ->> 'cle' = p_choix;
  if choix is null then raise exception 'Sélection inconnue.'; end if;

  update participations set solde = solde - p_mise
   where user_id = v_user and saison_id = m.saison_id;

  insert into paris (user_id, match_id, saison_id, marche, choix, libelle_marche, libelle_choix, mise, cote)
  values (v_user, p_match_id, m.saison_id, p_marche, p_choix,
          marche ->> 'libelle', choix ->> 'libelle', p_mise, (choix ->> 'cote')::numeric)
  returning * into v_pari;

  return to_jsonb(v_pari);
exception
  when unique_violation then
    raise exception 'Tu as déjà un pari en cours sur ce choix.';
end;
$$;

-- ------------------------------------------------------- Régler un match
create or replace function regler_match(p_match_id text, p_score_a integer, p_score_b integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m         record;
  attendu   integer;
  v_regles  integer := 0;
  pa        numeric; -- proba de map attendue
  reel_a    numeric;
  delta     numeric;
  ea        record;
  eb        record;
  pari      record;
  gagnant   boolean;
begin
  if not exists (select 1 from profils where id = auth.uid() and est_admin) then
    raise exception 'Réservé aux administrateurs.';
  end if;

  select * into m from matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut = 'termine' then raise exception 'Match déjà réglé.'; end if;

  attendu := ceil(m.format / 2.0);
  if greatest(p_score_a, p_score_b) <> attendu or p_score_a = p_score_b then
    raise exception 'Score impossible pour un BO% : le vainqueur doit avoir % maps.', m.format, attendu;
  end if;

  select * into ea from equipes where id = m.equipe_a_id for update;
  select * into eb from equipes where id = m.equipe_b_id for update;

  update matchs
     set score_a = p_score_a, score_b = p_score_b, statut = 'termine',
         elo_a_fige = ea.elo, elo_b_fige = eb.elo
   where id = p_match_id;

  -- Règlement des paris en cours
  for pari in select * from paris where match_id = p_match_id and statut = 'en_cours' loop
    gagnant := case pari.marche
      when 'vainqueur'   then (case when pari.choix = 'a' then p_score_a > p_score_b else p_score_b > p_score_a end)
      when 'score_exact' then pari.choix = p_score_a || '-' || p_score_b
      when 'total_maps'  then (case when pari.choix = 'under'
                                    then p_score_a + p_score_b <= greatest(p_score_a, p_score_b)
                                    else p_score_a + p_score_b >  greatest(p_score_a, p_score_b) end)
      else false
    end;

    update paris
       set statut = case when gagnant then 'gagne' else 'perdu' end,
           gain   = case when gagnant then round(pari.mise * pari.cote) else 0 end
     where id = pari.id;

    if gagnant then
      update participations
         set solde = solde + round(pari.mise * pari.cote)
       where user_id = pari.user_id and saison_id = pari.saison_id;
    end if;

    v_regles := v_regles + 1;
  end loop;

  -- Mise à jour des Elo, pondérée par l'écart de maps
  pa := clutch_proba_map(ea.elo, eb.elo);
  reel_a := p_score_a::numeric / (p_score_a + p_score_b);
  delta := clutch_elo_k() * (reel_a - pa);

  update equipes set elo = round(ea.elo + delta) where id = ea.id;
  update equipes set elo = round(eb.elo - delta) where id = eb.id;

  return jsonb_build_object(
    'regles', v_regles,
    'elo_a', (select elo from equipes where id = ea.id),
    'elo_b', (select elo from equipes where id = eb.id)
  );
end;
$$;

-- ----------------------------------------------------- Prime quotidienne
create or replace function reclamer_prime(p_saison_id text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_part participations%rowtype; v_statut text; montant integer;
begin
  if auth.uid() is null then raise exception 'Connecte-toi.'; end if;

  select statut into v_statut from v_saisons where id = p_saison_id;
  if v_statut is null then raise exception 'Saison inconnue.'; end if;
  if v_statut = 'terminee' then raise exception 'Cette saison est terminée.'; end if;
  if v_statut = 'a_venir' then raise exception 'Cette saison n''a pas encore commencé.'; end if;

  v_part := clutch_participation(auth.uid(), p_saison_id);
  if v_part.derniere_prime is not null and v_part.derniere_prime > now() - interval '24 hours' then
    raise exception 'Prime déjà réclamée. Reviens dans % h.',
      ceil(extract(epoch from (v_part.derniere_prime + interval '24 hours' - now())) / 3600);
  end if;

  montant := case when v_part.solde < clutch_seuil_faillite() then clutch_bonus() * 2 else clutch_bonus() end;
  update participations set solde = solde + montant, derniere_prime = now()
   where user_id = auth.uid() and saison_id = p_saison_id;
  return montant;
end;
$$;

-- ---------------------------------------------------------------- Ligues
create or replace function clutch_code_ligue()
returns text language sql volatile as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1), ''
  ) from generate_series(1, 6);
$$;

create or replace function creer_ligue(p_nom text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ligue ligues%rowtype; v_code text; essais integer := 0;
begin
  if auth.uid() is null then raise exception 'Connecte-toi.'; end if;
  if coalesce(trim(p_nom), '') = '' then raise exception 'Donne un nom à ta ligue.'; end if;

  loop
    v_code := clutch_code_ligue();
    exit when not exists (select 1 from ligues where code = v_code);
    essais := essais + 1;
    if essais > 20 then raise exception 'Impossible de générer un code, réessaie.'; end if;
  end loop;

  insert into ligues (nom, code, createur_id)
  values (left(trim(p_nom), 40), v_code, auth.uid())
  returning * into v_ligue;

  insert into membres_ligue (ligue_id, user_id) values (v_ligue.id, auth.uid());
  return to_jsonb(v_ligue);
end;
$$;

create or replace function rejoindre_ligue(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ligue ligues%rowtype;
begin
  if auth.uid() is null then raise exception 'Connecte-toi.'; end if;
  select * into v_ligue from ligues where code = upper(trim(p_code));
  if not found then raise exception 'Aucune ligue avec ce code.'; end if;
  if exists (select 1 from membres_ligue where ligue_id = v_ligue.id and user_id = auth.uid()) then
    raise exception 'Tu es déjà dans cette ligue.';
  end if;
  insert into membres_ligue (ligue_id, user_id) values (v_ligue.id, auth.uid());
  return to_jsonb(v_ligue);
end;
$$;

-- ----------------------------------------------------------- Classements
-- Un classement est TOUJOURS relatif à une saison : c'est le solde de la
-- participation qui est classé, jamais un solde global.
create or replace function clutch_classement(p_ids uuid[], p_saison_id text)
returns table (id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean)
language sql stable as $$
  select
    pr.id,
    pr.pseudo,
    coalesce(pt.solde, (select solde_initial from saisons where id = p_saison_id)) as solde,
    count(pa.id) filter (where pa.statut in ('gagne', 'perdu')) as paris,
    count(pa.id) filter (where pa.statut = 'gagne')             as gagnes,
    pr.id = auth.uid()                                          as moi
  from profils pr
  left join participations pt on pt.user_id = pr.id and pt.saison_id = p_saison_id
  left join paris pa on pa.user_id = pr.id and pa.saison_id = p_saison_id
  where pr.id = any (p_ids)
  group by pr.id, pr.pseudo, pt.solde
  order by solde desc, gagnes desc;
$$;

create or replace function classement_ligue(p_ligue_id uuid, p_saison_id text)
returns table (id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean)
language sql stable as $$
  select * from clutch_classement(
    array(select user_id from membres_ligue where ligue_id = p_ligue_id), p_saison_id
  );
$$;

create or replace function classement_global(p_saison_id text)
returns table (id uuid, pseudo text, solde integer, paris bigint, gagnes bigint, moi boolean)
language sql stable as $$
  select * from clutch_classement(
    array(
      select user_id from participations
      where saison_id = p_saison_id order by solde desc limit 100
    ),
    p_saison_id
  );
$$;

-- Vainqueur de chaque saison déjà close.
create or replace function palmares()
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x order by x -> 'saison' ->> 'fin' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'saison', to_jsonb(s),
      'vainqueur', (
        select to_jsonb(c) from clutch_classement(
          array(select user_id from participations where saison_id = s.id), s.id
        ) c limit 1
      )
    ) as x
    from v_saisons s
    where s.statut = 'terminee'
  ) t;
$$;

create or replace function mes_statistiques(p_saison_id text)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'solde', coalesce(
      (select solde from participations where user_id = auth.uid() and saison_id = p_saison_id),
      (select solde_initial from saisons where id = p_saison_id)
    ),
    'paris',  count(*) filter (where statut in ('gagne', 'perdu')),
    'gagnes', count(*) filter (where statut = 'gagne'),
    'mises',  coalesce(sum(mise) filter (where statut in ('gagne', 'perdu')), 0),
    'gains',  coalesce(sum(gain), 0),
    'roi', case
             when coalesce(sum(mise) filter (where statut in ('gagne', 'perdu')), 0) = 0 then 0
             else round(
               (coalesce(sum(gain), 0) - sum(mise) filter (where statut in ('gagne', 'perdu')))::numeric
               / sum(mise) filter (where statut in ('gagne', 'perdu')) * 100, 1)
           end
  )
  from paris where user_id = auth.uid() and saison_id = p_saison_id;
$$;
