import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { loadTeamOrganizations } from '@/src/features/onboarding/api';
import { GAMES } from '@/src/features/onboarding/constants';
import type { GameId, TeamOrganization } from '@/src/features/onboarding/types';
import { teamIdForOrganization } from '@/src/features/onboarding/utils';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing, typography } from '@/src/theme';

import { saveProfileSettings } from '../api';

export default function ProfileSettingsScreen() {
  const { profile, refreshProfile, session } = useAuth();
  const initialGames = useMemo(
    () => GAMES.map((game) => game.id).filter((id) => profile?.jeux_suivis.includes(id)),
    [profile?.jeux_suivis],
  );
  const [games, setGames] = useState<GameId[]>(initialGames);
  const [organizations, setOrganizations] = useState<TeamOrganization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState(profile?.profil_public !== false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const teamRequest = useRef(0);

  useEffect(() => {
    setPublicProfile(profile?.profil_public !== false);
  }, [profile?.profil_public]);

  useEffect(() => {
    const requestId = ++teamRequest.current;
    if (!games.length) {
      setOrganizations([]);
      setSelectedOrganization(null);
      setLoadingTeams(false);
      return;
    }

    setLoadingTeams(true);
    setError(null);
    loadTeamOrganizations(games)
      .then((next) => {
        if (requestId !== teamRequest.current) return;
        setOrganizations(next);
        setSelectedOrganization((current) => {
          if (current && next.some((organization) => organization.key === current)) return current;
          return next.find((organization) => organization.teams.some((team) => team.id === profile?.equipe_favorite_id))?.key ?? null;
        });
      })
      .catch(() => {
        if (requestId !== teamRequest.current) return;
        setOrganizations([]);
        setSelectedOrganization(null);
        setError('Impossible de charger les équipes pour le moment.');
      })
      .finally(() => {
        if (requestId === teamRequest.current) setLoadingTeams(false);
      });
  }, [games, profile?.equipe_favorite_id]);

  const selectedTeamId = useMemo(() => {
    const organization = organizations.find((item) => item.key === selectedOrganization);
    return organization ? teamIdForOrganization(organization, games) : null;
  }, [games, organizations, selectedOrganization]);

  const originalGames = useMemo(
    () => [...(profile?.jeux_suivis ?? [])].sort().join('|'),
    [profile?.jeux_suivis],
  );
  const currentGames = useMemo(() => [...games].sort().join('|'), [games]);
  const dirty = currentGames !== originalGames
    || selectedTeamId !== profile?.equipe_favorite_id
    || publicProfile !== (profile?.profil_public !== false);
  const canSave = Boolean(session?.user.id && games.length && selectedTeamId && dirty && !loadingTeams && !saving);

  function toggleGame(id: GameId) {
    setSaved(false);
    setGames((current) => current.includes(id)
      ? current.filter((game) => game !== id)
      : [...current, id]);
  }

  async function save() {
    if (!session?.user.id || !selectedTeamId || !canSave) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveProfileSettings(session.user.id, games, selectedTeamId, publicProfile);
      await refreshProfile();
      setSaved(true);
    } catch (caught) {
      setError(settingsError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Revenir au profil" accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>← MOI</Text></Pressable>
          <View style={styles.headerMark}><Text style={styles.headerMarkText}>⚙</Text></View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>MOI // PARAMÈTRES</Text>
          <Text style={styles.title}>RÈGLE TON TERRAIN.</Text>
          <Text style={styles.subtitle}>Tes choix alimentent le Hub, les matchs proposés et l’identité publique de ton profil.</Text>
        </View>

        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
        {saved ? <View style={styles.success}><Text style={styles.successText}>PARAMÈTRES ENREGISTRÉS · TOUT CLUTCH EST À JOUR.</Text></View> : null}

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>01 // JEUX SUIVIS</Text><Text style={styles.sectionTitle}>TES TERRAINS.</Text></View><Text style={styles.sectionMeta}>{games.length}/3</Text></View>
          <View style={styles.gamesGrid}>
            {GAMES.map((game) => {
              const active = games.includes(game.id);
              return (
                <Pressable
                  key={game.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  onPress={() => toggleGame(game.id)}
                  style={({ pressed }) => [styles.gameCard, active && styles.gameCardActive, pressed && styles.pressed]}
                >
                  <View style={[styles.gameMark, { borderColor: game.accent }, active && { backgroundColor: `${game.accent}22` }]}><Text style={[styles.gameCode, { color: game.accent }]}>{game.code}</Text></View>
                  <Text style={styles.gameShort}>{game.short}</Text>
                  <Text numberOfLines={1} style={styles.gameName}>{game.name}</Text>
                  <Text style={[styles.gameState, active && styles.gameStateActive]}>{active ? 'SUIVI ✓' : 'AJOUTER'}</Text>
                </Pressable>
              );
            })}
          </View>
          {!games.length ? <Text style={styles.validation}>Choisis au moins un jeu pour continuer.</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>02 // ÉQUIPE FAVORITE</Text><Text style={styles.sectionTitle}>TA COULEUR.</Text></View></View>
          <Text style={styles.sectionCopy}>Changer de faction est limité à une fois tous les 7 jours.</Text>
          {loadingTeams ? <View style={styles.teamSkeleton} /> : organizations.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamRail}>
              {organizations.map((organization) => {
                const active = selectedOrganization === organization.key;
                return (
                  <Pressable
                    key={organization.key}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => { setSelectedOrganization(organization.key); setSaved(false); }}
                    style={({ pressed }) => [styles.teamCard, active && styles.teamCardActive, pressed && styles.pressed]}
                  >
                    <View style={[styles.teamMark, active && styles.teamMarkActive]}><Text style={[styles.teamTag, active && styles.teamTagActive]}>{organization.tag.slice(0, 4)}</Text></View>
                    <Text numberOfLines={2} style={styles.teamName}>{organization.name}</Text>
                    <Text style={[styles.teamGames, active && styles.teamGamesActive]}>{organization.games.map(gameLabel).join(' · ')}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : games.length ? <Text style={styles.validation}>Aucune équipe disponible pour cette sélection.</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><View><Text style={styles.sectionEyebrow}>03 // VISIBILITÉ</Text><Text style={styles.sectionTitle}>TON PROFIL.</Text></View></View>
          <Pressable
            accessibilityLabel="Profil public"
            accessibilityRole="switch"
            accessibilityState={{ checked: publicProfile }}
            onPress={() => { setPublicProfile((current) => !current); setSaved(false); }}
            style={({ pressed }) => [styles.visibilityCard, pressed && styles.pressed]}
          >
            <View style={styles.visibilityCopy}><Text style={styles.visibilityTitle}>{publicProfile ? 'PROFIL PUBLIC' : 'PROFIL PRIVÉ'}</Text><Text style={styles.visibilityMeta}>{publicProfile ? 'Les joueurs peuvent ouvrir ton identité Clutch.' : 'Toi seul peux consulter ton profil complet.'}</Text></View>
            <View style={[styles.switchTrack, publicProfile && styles.switchTrackActive]}><View style={[styles.switchThumb, publicProfile && styles.switchThumbActive]} /></View>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" disabled={!canSave} onPress={() => void save()} style={({ pressed }) => [styles.save, !canSave && styles.disabled, pressed && canSave && styles.pressed]}>
          <Text style={styles.saveText}>{saving ? 'ENREGISTREMENT…' : dirty ? 'ENREGISTRER LES PARAMÈTRES' : 'PARAMÈTRES À JOUR'}</Text><Text style={styles.saveArrow}>{saving ? '·' : '→'}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function settingsError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : '';
  if (message.includes('Changement de faction bloqué')) return message;
  if (message.toLowerCase().includes('row-level security')) return 'La session ne permet plus de modifier ce profil. Reconnecte-toi puis réessaie.';
  return message || 'Impossible d’enregistrer les paramètres.';
}

function gameLabel(game: GameId) {
  if (game === 'valorant') return 'VAL';
  return game.toUpperCase();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', paddingHorizontal: spacing.md, paddingBottom: 72, gap: 25 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#171D23' },
  back: { minHeight: 38, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#28313A' },
  backText: { ...typography.action, color: colors.text, letterSpacing: .4 },
  headerMark: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, headerMarkText: { color: '#080A0C', fontSize: 17, fontWeight: '900' },
  intro: { gap: 8 }, eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.1 }, title: { ...typography.displayMedium, maxWidth: 360, color: colors.text }, subtitle: { ...typography.body, maxWidth: 360, color: colors.textMuted },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { ...typography.body, color: '#FF9AA2' },
  success: { padding: 12, borderRadius: radius.md, backgroundColor: '#0E1C14', borderWidth: 1, borderColor: '#23583A' }, successText: { ...typography.label, color: colors.success, letterSpacing: .3 },
  section: { gap: 12 }, sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }, sectionEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 }, sectionTitle: { ...typography.sectionTitle, marginTop: 4, color: colors.text }, sectionMeta: { ...typography.label, color: colors.textMuted }, sectionCopy: { ...typography.body, color: colors.textMuted },
  gamesGrid: { flexDirection: 'row', gap: 8 },
  gameCard: { flex: 1, minHeight: 170, padding: 11, borderRadius: 21, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, gameCardActive: { backgroundColor: '#11170E', borderColor: '#48541E' },
  gameMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: '#0A0F14' }, gameCode: { ...typography.cardTitle }, gameShort: { ...typography.bodyStrong, marginTop: 15, color: colors.text }, gameName: { ...typography.caption, marginTop: 3, color: colors.textMuted }, gameState: { ...typography.label, marginTop: 'auto', color: '#65717D', letterSpacing: .3 }, gameStateActive: { color: colors.volt },
  validation: { ...typography.caption, color: '#FF9AA2' },
  teamRail: { gap: 9, paddingRight: spacing.md }, teamSkeleton: { height: 182, borderRadius: 24, backgroundColor: '#10161D' },
  teamCard: { width: 154, minHeight: 182, padding: 13, borderRadius: 23, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, teamCardActive: { backgroundColor: '#11170E', borderColor: '#48541E' },
  teamMark: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111820', borderWidth: 1, borderColor: '#303A43' }, teamMarkActive: { backgroundColor: colors.volt, borderColor: colors.volt }, teamTag: { ...typography.action, color: colors.text }, teamTagActive: { color: '#080A0C' }, teamName: { ...typography.bodyStrong, marginTop: 16, color: colors.text }, teamGames: { ...typography.label, marginTop: 'auto', color: colors.textMuted }, teamGamesActive: { color: colors.volt },
  visibilityCard: { minHeight: 116, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 15, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, visibilityCopy: { flex: 1, minWidth: 0 }, visibilityTitle: { ...typography.cardTitle, color: colors.text }, visibilityMeta: { ...typography.body, marginTop: 5, color: colors.textMuted },
  switchTrack: { width: 52, height: 30, padding: 3, borderRadius: 16, justifyContent: 'center', backgroundColor: '#242D35' }, switchTrackActive: { backgroundColor: colors.volt }, switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#75808C' }, switchThumbActive: { alignSelf: 'flex-end', backgroundColor: '#080A0C' },
  save: { minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 18, backgroundColor: colors.volt }, saveText: { ...typography.action, color: '#080A0C', letterSpacing: .3 }, saveArrow: { color: '#080A0C', fontSize: 18, fontWeight: '900' },
  disabled: { opacity: 0.42 }, pressed: { opacity: 0.74 },
});
