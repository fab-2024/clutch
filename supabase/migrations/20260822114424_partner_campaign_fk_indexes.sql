-- Cover Nova Week foreign-key lookup paths used by account deletion, match
-- cleanup and task maintenance. These indexes also keep cascade checks from
-- scanning all campaign participation rows as the pilot grows.

create index if not exists campagne_participations_user_idx
  on private.campagne_participations (user_id);

create index if not exists campagne_matchs_suivis_match_idx
  on private.campagne_matchs_suivis (match_id);

create index if not exists campagne_actions_tache_idx
  on private.campagne_actions (campagne_key, tache_key);
