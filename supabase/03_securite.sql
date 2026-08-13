-- =====================================================================
--  Clutch — sécurité (Row Level Security).
--
--  Principe : la clé "anon" est publique et vit dans le navigateur. Tout
--  ce qui protège les données, c'est ce fichier. Règle d'or : AUCUNE
--  écriture directe sur les tables sensibles — solde, paris et résultats
--  ne se modifient qu'à travers les fonctions SECURITY DEFINER de 02.
-- =====================================================================

alter table profils        enable row level security;
alter table equipes        enable row level security;
alter table evenements     enable row level security;
alter table matchs         enable row level security;
alter table paris          enable row level security;
alter table ligues         enable row level security;
alter table membres_ligue  enable row level security;

-- --------------------------------------------------------------- Profils
-- Chacun lit son propre profil en entier.
drop policy if exists "profil lisible par son propriétaire" on profils;
create policy "profil lisible par son propriétaire"
  on profils for select using (auth.uid() = id);

-- Les profils des membres de mes ligues sont lisibles (nécessaire au classement).
drop policy if exists "profils des colistiers lisibles" on profils;
create policy "profils des colistiers lisibles"
  on profils for select using (
    exists (
      select 1
      from membres_ligue moi
      join membres_ligue autre on autre.ligue_id = moi.ligue_id
      where moi.user_id = auth.uid() and autre.user_id = profils.id
    )
  );

-- Le joueur peut changer son pseudo, rien d'autre : le solde et le statut
-- admin sont verrouillés par le trigger ci-dessous.
drop policy if exists "modification de son propre pseudo" on profils;
create policy "modification de son propre pseudo"
  on profils for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.verrouiller_champs_sensibles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Les fonctions SECURITY DEFINER passent en tant que propriétaire du schéma :
  -- seul un appel utilisateur direct est bloqué ici.
  if current_setting('role', true) = 'authenticated' then
    new.solde          := old.solde;
    new.est_admin      := old.est_admin;
    new.derniere_prime := old.derniere_prime;
  end if;
  return new;
end;
$$;

drop trigger if exists profils_verrou on profils;
create trigger profils_verrou
  before update on profils
  for each row execute function public.verrouiller_champs_sensibles();

-- ------------------------------------------------- Données de compétition
-- Publiques en lecture : n'importe qui peut consulter le calendrier et les cotes.
drop policy if exists "équipes publiques" on equipes;
create policy "équipes publiques" on equipes for select using (true);

drop policy if exists "évènements publics" on evenements;
create policy "évènements publics" on evenements for select using (true);

drop policy if exists "matchs publics" on matchs;
create policy "matchs publics" on matchs for select using (true);

-- Seuls les admins peuvent créer ou modifier un match / une équipe.
drop policy if exists "matchs modifiables par les admins" on matchs;
create policy "matchs modifiables par les admins"
  on matchs for all
  using (exists (select 1 from profils where id = auth.uid() and est_admin))
  with check (exists (select 1 from profils where id = auth.uid() and est_admin));

drop policy if exists "équipes modifiables par les admins" on equipes;
create policy "équipes modifiables par les admins"
  on equipes for all
  using (exists (select 1 from profils where id = auth.uid() and est_admin))
  with check (exists (select 1 from profils where id = auth.uid() and est_admin));

drop policy if exists "évènements modifiables par les admins" on evenements;
create policy "évènements modifiables par les admins"
  on evenements for all
  using (exists (select 1 from profils where id = auth.uid() and est_admin))
  with check (exists (select 1 from profils where id = auth.uid() and est_admin));

-- ------------------------------------------------------------------ Paris
-- Je lis mes paris. Je n'en écris JAMAIS un directement : seule la fonction
-- placer_pari() peut insérer, parce qu'elle seule débite le solde.
drop policy if exists "mes paris" on paris;
create policy "mes paris" on paris for select using (auth.uid() = user_id);

-- (aucune policy insert/update/delete : tout passe par les fonctions)

-- ----------------------------------------------------------------- Ligues
drop policy if exists "ligues de mes ligues" on ligues;
create policy "ligues de mes ligues"
  on ligues for select using (
    exists (select 1 from membres_ligue where ligue_id = ligues.id and user_id = auth.uid())
  );

drop policy if exists "membres visibles entre colistiers" on membres_ligue;
create policy "membres visibles entre colistiers"
  on membres_ligue for select using (
    exists (select 1 from membres_ligue m2 where m2.ligue_id = membres_ligue.ligue_id and m2.user_id = auth.uid())
  );

-- Quitter une ligue : autorisé sur sa propre adhésion.
drop policy if exists "quitter une ligue" on membres_ligue;
create policy "quitter une ligue" on membres_ligue for delete using (auth.uid() = user_id);

-- ------------------------------------------------------- Droits d'exécution
revoke all on function placer_pari(text, text, text, integer) from public;
revoke all on function regler_match(text, integer, integer) from public;
revoke all on function reclamer_prime() from public;
revoke all on function creer_ligue(text) from public;
revoke all on function rejoindre_ligue(text) from public;

grant execute on function placer_pari(text, text, text, integer)   to authenticated;
grant execute on function regler_match(text, integer, integer)     to authenticated;
grant execute on function reclamer_prime()                         to authenticated;
grant execute on function creer_ligue(text)                        to authenticated;
grant execute on function rejoindre_ligue(text)                    to authenticated;
grant execute on function cotes_du_match(text)                     to anon, authenticated;
grant execute on function classement_ligue(uuid)                   to authenticated;
grant execute on function classement_global()                      to anon, authenticated;
grant execute on function mes_statistiques()                       to authenticated;

-- ----------------------------------------------------------- Se nommer admin
-- Après ta première connexion, exécute cette ligne avec TON e-mail :
--
--   update profils set est_admin = true where email = 'toi@exemple.fr';
--
-- Sans ça, personne ne peut régler de match.
