-- =====================================================================
--  Clutch — création de compétition depuis la console d'administration.
--
--  À exécuter APRÈS 01 à 08. Idempotent.
--
--  Jusqu'ici, créer un tournoi, une équipe ou un match supposait d'écrire des
--  INSERT à la main dans l'éditeur SQL. C'était le dernier obstacle entre le
--  produit et une vraie partie : tout tournait sur des affiches inventées.
--
--  Il apporte aussi l'ANNULATION avec remboursement, identifiée comme risque
--  dans le cadrage initial (« matchs reportés, forfaits ») et jamais traitée.
-- =====================================================================

alter table matchs add column if not exists motif_annulation text;

-- Retire les accents sans dépendre de l'extension unaccent, absente par défaut.
create or replace function unaccent_simple(p_texte text)
returns text language sql immutable as $$
  select translate(
    p_texte,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
$$;

-- --------------------------------------------------------------- Tournois
create or replace function creer_evenement(p_nom text, p_jeu text, p_tier text default 'A')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id text; v_ev evenements%rowtype;
begin
  if not clutch_est_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  if coalesce(trim(p_nom), '') = '' then raise exception 'Donne un nom au tournoi.'; end if;
  if p_jeu not in ('lol', 'cs2', 'valorant') then raise exception 'Jeu inconnu.'; end if;

  -- Identifiant lisible, dérivé du nom : « LEC Summer » -> « ev-lec-summer ».
  v_id := 'ev-' || left(regexp_replace(lower(unaccent_simple(p_nom)), '[^a-z0-9]+', '-', 'g'), 40);
  v_id := trim(both '-' from v_id);

  if exists (select 1 from evenements where id = v_id) then
    raise exception 'Un tournoi porte déjà ce nom.';
  end if;

  insert into evenements (id, jeu, nom, tier)
  values (v_id, p_jeu, left(trim(p_nom), 60), coalesce(p_tier, 'A'))
  returning * into v_ev;
  return to_jsonb(v_ev);
end;
$$;

-- ---------------------------------------------------------------- Équipes
create or replace function creer_equipe(p_nom text, p_tag text, p_jeu text, p_elo integer default 1500)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id text; v_eq equipes%rowtype;
begin
  if not clutch_est_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  if coalesce(trim(p_nom), '') = '' then raise exception 'Donne un nom à l''équipe.'; end if;
  if trim(p_tag) !~ '^[A-Za-z0-9.]{2,6}$' then
    raise exception 'Le tag fait 2 à 6 caractères, sans espace.';
  end if;
  if p_jeu not in ('lol', 'cs2', 'valorant') then raise exception 'Jeu inconnu.'; end if;
  if p_elo < 1000 or p_elo > 2200 then
    raise exception 'L''Elo de départ doit être entre 1000 et 2200.';
  end if;

  v_id := 'eq-' || left(regexp_replace(lower(unaccent_simple(p_nom)), '[^a-z0-9]+', '-', 'g'), 40);
  v_id := trim(both '-' from v_id);
  if exists (select 1 from equipes where id = v_id) then
    raise exception 'Une équipe porte déjà ce nom.';
  end if;

  insert into equipes (id, jeu, nom, tag, elo)
  values (v_id, p_jeu, left(trim(p_nom), 40), upper(trim(p_tag)), p_elo)
  returning * into v_eq;
  return to_jsonb(v_eq);
end;
$$;

-- ----------------------------------------------------------------- Matchs
create or replace function creer_match(
  p_event_id text, p_equipe_a text, p_equipe_b text,
  p_format integer, p_debut timestamptz, p_saison_id text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ev record; v_a record; v_b record; v_id text;
begin
  if not clutch_est_admin() then raise exception 'Réservé aux administrateurs.'; end if;

  select * into v_ev from evenements where id = p_event_id;
  if not found then raise exception 'Tournoi inconnu.'; end if;
  if p_equipe_a = p_equipe_b then raise exception 'Une équipe ne joue pas contre elle-même.'; end if;
  if p_format not in (1, 3, 5) then raise exception 'Format attendu : BO1, BO3 ou BO5.'; end if;

  -- Un match créé après son coup d'envoi serait fermé aux mises d'emblée, et
  -- personne ne comprendrait pourquoi. On refuse plutôt que de le laisser passer.
  if p_debut <= now() then
    raise exception 'La date doit être dans le futur, sinon les mises sont fermées d''emblée.';
  end if;
  if not exists (select 1 from saisons where id = p_saison_id) then
    raise exception 'Saison inconnue.';
  end if;

  select * into v_a from equipes where id = p_equipe_a;
  select * into v_b from equipes where id = p_equipe_b;
  if v_a is null or v_b is null then raise exception 'Équipe inconnue.'; end if;
  if v_a.jeu <> v_ev.jeu or v_b.jeu <> v_ev.jeu then
    raise exception 'Les deux équipes doivent jouer au même jeu que le tournoi.';
  end if;

  v_id := gen_random_uuid()::text;
  insert into matchs (id, event_id, saison_id, jeu, equipe_a_id, equipe_b_id, format, debut, statut)
  values (v_id, p_event_id, p_saison_id, v_ev.jeu, p_equipe_a, p_equipe_b, p_format, p_debut, 'a_venir');

  return (select to_jsonb(v) from v_matchs v where v.id = v_id);
end;
$$;

/*
 * Annulation d'un match, avec remboursement intégral.
 *
 * Le filet manquant du cadrage : un match reporté ou un forfait ne doit pas
 * priver les joueurs de leur mise. On rembourse à l'unité près, et on ne
 * touche NI aux notes NI aux Elo — un match qui n'a pas eu lieu n'apprend
 * rien sur personne.
 */
create or replace function annuler_match(p_match_id text, p_motif text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare m record; v_nb integer := 0; v_total bigint := 0; pari record;
begin
  if not clutch_est_admin() then raise exception 'Réservé aux administrateurs.'; end if;

  select * into m from matchs where id = p_match_id for update;
  if not found then raise exception 'Match introuvable.'; end if;
  if m.statut = 'termine' then raise exception 'Un match déjà réglé ne peut plus être annulé.'; end if;
  if m.statut = 'annule' then raise exception 'Match déjà annulé.'; end if;

  for pari in select * from paris where match_id = p_match_id and statut = 'en_cours' loop
    update paris set statut = 'rembourse', gain = pari.mise where id = pari.id;
    update participations set solde = solde + pari.mise
     where user_id = pari.user_id and saison_id = pari.saison_id;
    v_nb := v_nb + 1;
    v_total := v_total + pari.mise;
  end loop;

  update matchs
     set statut = 'annule', motif_annulation = nullif(left(coalesce(p_motif, ''), 120), '')
   where id = p_match_id;

  return jsonb_build_object('rembourses', v_nb, 'total', v_total);
end;
$$;

-- ---------------------------------------------------------------- Droits
revoke all on function creer_evenement(text, text, text)                          from public;
revoke all on function creer_equipe(text, text, text, integer)                     from public;
revoke all on function creer_match(text, text, text, integer, timestamptz, text)   from public;
revoke all on function annuler_match(text, text)                                   from public;

grant execute on function creer_evenement(text, text, text)                        to authenticated;
grant execute on function creer_equipe(text, text, text, integer)                  to authenticated;
grant execute on function creer_match(text, text, text, integer, timestamptz, text) to authenticated;
grant execute on function annuler_match(text, text)                                to authenticated;
grant execute on function unaccent_simple(text)                                    to anon, authenticated;
