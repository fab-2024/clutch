# Restored display materials — 2026-09-09

The Carbon display is an equipable item, no longer the sentinel for an empty
display slot. An empty slot is represented by `rankDisplay: null`, with a dedicated
authenticated removal RPC. Preview items follow the same rule.

Carbon, Crystal Capsule, Royal Crown and Orbital Core now use opaque-material
sprites for both shop cards and room rendering. Their empty chambers and exterior
background remain transparent. These sprites bypass the alpha restoration filter;
that filter remains enabled only for Revelation.

`manifest.json` records the generation prompts, source images and final asset paths.
The user-authorized background removal can be reproduced with
`mobile/scripts/prepare-restored-displays.py`. The four final RGBA images were
inspected visually. In-app browser inspection was unavailable during this pass.

Validation includes equipment/removal/re-equipment and persistence-error recovery
in the screen tests, scene rendering tests, and the remote SQL contract in
`supabase/tests/showcase_rank_display_removal.sql`. The SQL test rolls back all
equipment changes and confirms that Volts remain unchanged.
