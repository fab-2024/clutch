import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, layout, radius, spacing } from '@/src/theme';

import { loadDuels } from '../api';
import type { DuelRow, DuelStatus } from '../types';

export default function DuelsScreen() {
  const [duels, setDuels] = useState<DuelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setDuels(await loadDuels()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger tes duels.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = duels.filter((duel) => {
    const status = effectiveStatus(duel);
    return status === 'en_attente' || status === 'accepte';
  });
  const finished = duels.filter((duel) => duel.statut === 'termine');
  const featured = active[0] ?? duels[0] ?? null;

  function openDuel(token: string) {
    router.push({ pathname: '/duel/[token]', params: { token } });
  }

  function openInvitation() {
    const token = extractToken(inviteCode);
    if (!token) return;
    setInviteCode('');
    openDuel(token);
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
    >
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>⚔ SOCIAL // DUELS</Text>
        <Text style={styles.title}>UN CALL. DEUX JOUEURS.</Text>
        <Text style={styles.subtitle}>Aucune mise supplémentaire. Le duel transforme deux pronostics réels en rivalité.</Text>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

      {loading ? <View style={styles.skeleton} /> : featured ? <DuelHero duel={featured} onOpen={() => openDuel(featured.token)} /> : <EmptyDuelHero />}

      <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.newDuel, pressed && styles.pressed]}>
        <View><Text style={styles.newDuelEyebrow}>NOUVEAU DUEL</Text><Text style={styles.newDuelTitle}>Choisis ton match.</Text><Text style={styles.newDuelCopy}>Pose ton call puis invite un rival sur le camp opposé.</Text></View>
        <View style={styles.newDuelArrow}><Text style={styles.newDuelArrowText}>→</Text></View>
      </Pressable>

      <View style={styles.inviteCard}>
        <View style={styles.inviteCopy}><Text style={styles.inviteEyebrow}>REJOINDRE UN RIVAL</Text><Text style={styles.inviteTitle}>Tu as reçu un code ?</Text></View>
        <TextInput
          accessibilityLabel="Code ou lien d’invitation au duel"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setInviteCode}
          onSubmitEditing={openInvitation}
          placeholder="Colle le code ou le lien"
          placeholderTextColor="#596570"
          value={inviteCode}
          style={styles.inviteInput}
        />
        <Pressable accessibilityRole="button" disabled={!extractToken(inviteCode)} onPress={openInvitation} style={({ pressed }) => [styles.inviteButton, !extractToken(inviteCode) && styles.disabled, pressed && styles.pressed]}><Text style={styles.inviteButtonText}>OUVRIR L’INVITATION</Text></Pressable>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statValue}>{active.length}</Text><Text style={styles.statLabel}>ACTIFS</Text></View>
        <View style={styles.divider} />
        <View style={styles.stat}><Text style={styles.statValue}>{finished.length}</Text><Text style={styles.statLabel}>TERMINÉS</Text></View>
        <View style={styles.divider} />
        <View style={styles.stat}><Text style={styles.statValue}>{duels.length}</Text><Text style={styles.statLabel}>TOTAL</Text></View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>TES RIVALITÉS</Text><Text style={styles.sectionMeta}>{duels.length}</Text></View>
        {loading ? <View style={styles.listSkeleton} /> : duels.length ? duels.map((duel) => <DuelCard key={duel.token} duel={duel} onOpen={() => openDuel(duel.token)} />) : <View style={styles.emptyList}><Text style={styles.emptyListText}>Ton premier duel apparaîtra ici après un challenge.</Text></View>}
      </View>
    </ScrollView>
  );
}

function DuelHero({ duel, onOpen }: { duel: DuelRow; onOpen: () => void }) {
  const creator = duel.moi_role === 'createur';
  const rival = creator ? (duel.accepteur_pseudo || 'EN ATTENTE') : (duel.createur_pseudo || 'RIVAL');
  const mine = creator ? 'TOI' : (duel.accepteur_pseudo || 'TOI');
  const myChoice = creator ? duel.createur_choix : duel.accepteur_choix;
  const myTag = myChoice === 'a' ? (duel.tag_a || duel.equipe_a || 'A') : myChoice === 'b' ? (duel.tag_b || duel.equipe_b || 'B') : '—';
  const rivalTag = myChoice === 'a' ? (duel.tag_b || duel.equipe_b || 'B') : myChoice === 'b' ? (duel.tag_a || duel.equipe_a || 'A') : '?';
  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
      <View style={styles.heroBlue} /><View style={styles.heroRed} />
      <View style={styles.heroTop}><Text style={styles.heroMeta}>{gameLabel(duel.jeu)} · {duel.evenement || 'MATCH'}</Text><Status status={effectiveStatus(duel)} /></View>
      <Text style={styles.heroKicker}>{duel.statut === 'termine' ? 'VERDICT FINAL' : 'FACE-À-FACE'}</Text>
      <View style={styles.faceoff}>
        <Player side="left" pseudo={mine} tag={myTag} />
        <View style={styles.vsBlock}><Text style={styles.vs}>VS</Text><View style={styles.vsLine} /></View>
        <Player side="right" pseudo={rival} tag={rivalTag} />
      </View>
      <Text style={styles.heroDate}>{formatDate(duel.debut)}</Text>
    </Pressable>
  );
}

function Player({ side, pseudo, tag }: { side: 'left' | 'right'; pseudo: string; tag: string }) {
  return (
    <View style={[styles.player, side === 'right' && styles.playerRight]}>
      <View style={[styles.playerMark, side === 'right' && styles.playerMarkRight]}><Text style={styles.playerTag}>{tag}</Text></View>
      <Text numberOfLines={1} style={styles.playerPseudo}>{pseudo}</Text>
      <Text style={styles.playerRole}>{side === 'left' ? 'TON CAMP' : 'RIVAL'}</Text>
    </View>
  );
}

function EmptyDuelHero() {
  return (
    <View style={styles.emptyHero}>
      <Text style={styles.emptyEyebrow}>AUCUNE RIVALITÉ ACTIVE</Text>
      <Text style={styles.emptyTitle}>TON PREMIER FACE-À-FACE COMMENCE DANS L’ARENA.</Text>
      <Text style={styles.emptyText}>Prends position sur un match, puis défie quelqu’un qui assume le camp opposé.</Text>
    </View>
  );
}

function DuelCard({ duel, onOpen }: { duel: DuelRow; onOpen: () => void }) {
  const creator = duel.moi_role === 'createur';
  const rival = creator ? (duel.accepteur_pseudo || 'En attente') : (duel.createur_pseudo || 'Rival');
  const myChoice = creator ? duel.createur_choix : duel.accepteur_choix;
  const myTag = myChoice === 'a' ? (duel.tag_a || duel.equipe_a || 'A') : myChoice === 'b' ? (duel.tag_b || duel.equipe_b || 'B') : '—';
  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardMain}>
        <Text style={styles.cardEyebrow}>{gameLabel(duel.jeu)} · {duel.evenement || 'MATCH'}</Text>
        <Text style={styles.cardTitle}>{myTag} <Text style={styles.cardVs}>VS</Text> {rival}</Text>
        <Text style={styles.cardDate}>{formatDate(duel.debut)}</Text>
      </View>
      <Status status={effectiveStatus(duel)} />
    </Pressable>
  );
}

function Status({ status }: { status: DuelStatus }) {
  const label = status === 'termine' ? 'TERMINÉ' : status === 'accepte' ? 'VERROUILLÉ' : status === 'annule' ? 'ANNULÉ' : status === 'expire' ? 'EXPIRÉ' : 'EN ATTENTE';
  const active = status === 'en_attente' || status === 'accepte';
  return <View style={[styles.status, active && styles.statusActive]}><View style={[styles.statusDot, active && styles.statusDotActive]} /><Text style={[styles.statusText, active && styles.statusTextActive]}>{label}</Text></View>;
}

function gameLabel(value?: string) { const game = String(value || '').toLowerCase(); if (game.includes('lol')) return 'LOL'; if (game.includes('valorant')) return 'VAL'; if (game.includes('cs')) return 'CS2'; return 'ESPORT'; }
function formatDate(value?: string) { if (!value) return 'Date à venir'; const date = new Date(value); if (!Number.isFinite(date.getTime())) return 'Date à venir'; return date.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function effectiveStatus(duel: DuelRow): DuelStatus { return duel.statut === 'en_attente' && duel.debut && new Date(duel.debut).getTime() <= Date.now() ? 'expire' : duel.statut; }
function extractToken(value: string) { const cleaned = value.trim().split(/[?#]/)[0].replace(/\/+$/, ''); const token = cleaned.split('/').pop()?.toLowerCase() || ''; return /^[a-f0-9]{12,64}$/.test(token) ? token : ''; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.md, paddingBottom: layout.tabBarContentInset, gap: 22 },
  intro: { gap: 8, paddingTop: 4 }, eyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }, title: { maxWidth: 365, color: colors.text, fontSize: 35, lineHeight: 35, fontWeight: '900', letterSpacing: -1.6 }, subtitle: { maxWidth: 360, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { color: '#FF9AA2', fontSize: 11 },
  skeleton: { height: 320, borderRadius: 30, backgroundColor: '#10161D' },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 320, padding: 18, borderRadius: 30, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#28323B' }, heroBlue: { position: 'absolute', left: -70, bottom: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: '#123A67', opacity: 0.55 }, heroRed: { position: 'absolute', right: -70, bottom: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: '#5B173C', opacity: 0.5 },
  heroTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, heroMeta: { flex: 1, color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 }, heroKicker: { zIndex: 2, marginTop: 30, color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  faceoff: { zIndex: 2, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, player: { width: '38%', alignItems: 'flex-start' }, playerRight: { alignItems: 'flex-end' }, playerMark: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101C27', borderWidth: 1, borderColor: '#315B7A' }, playerMarkRight: { backgroundColor: '#23121D', borderColor: '#78345A' }, playerTag: { color: colors.text, fontSize: 17, fontWeight: '900' }, playerPseudo: { width: '100%', marginTop: 10, color: colors.text, fontSize: 15, fontWeight: '900' }, playerRole: { marginTop: 3, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  vsBlock: { width: 54, alignItems: 'center' }, vs: { color: colors.text, fontSize: 39, lineHeight: 42, fontWeight: '900', letterSpacing: -2 }, vsLine: { width: 26, height: 3, marginTop: 6, backgroundColor: colors.volt }, heroDate: { zIndex: 2, marginTop: 28, color: colors.textMuted, fontSize: 9, textAlign: 'center' },
  status: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 999, backgroundColor: '#11161C', borderWidth: 1, borderColor: '#242D35' }, statusActive: { backgroundColor: '#171E0E', borderColor: '#3D491D' }, statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#596570' }, statusDotActive: { backgroundColor: colors.volt }, statusText: { color: colors.textMuted, fontSize: 6, fontWeight: '900', letterSpacing: 0.5 }, statusTextActive: { color: colors.volt },
  newDuel: { minHeight: 105, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 17, borderRadius: 25, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#414D1E' }, newDuelEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 }, newDuelTitle: { marginTop: 4, color: colors.text, fontSize: 18, fontWeight: '900' }, newDuelCopy: { marginTop: 4, maxWidth: 275, color: colors.textMuted, fontSize: 10, lineHeight: 15 }, newDuelArrow: { marginLeft: 'auto', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, newDuelArrowText: { color: '#080A0C', fontSize: 17, fontWeight: '900' },
  inviteCard: { padding: 16, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 10 }, inviteCopy: { gap: 4 }, inviteEyebrow: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1.1 }, inviteTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, inviteInput: { minHeight: 48, paddingHorizontal: 13, borderRadius: 14, backgroundColor: '#070B0F', borderWidth: 1, borderColor: '#263039', color: colors.text, fontSize: 12, fontWeight: '700' }, inviteButton: { minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.volt }, inviteButtonText: { color: '#080A0C', fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  stats: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 16, borderRadius: 23, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, stat: { minWidth: 70, alignItems: 'center' }, statValue: { color: colors.text, fontSize: 23, fontWeight: '900' }, statLabel: { marginTop: 3, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.9 }, divider: { width: 1, height: 36, backgroundColor: colors.border },
  section: { gap: 9 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between' }, sectionLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, sectionMeta: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  card: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, cardMain: { flex: 1, minWidth: 0 }, cardEyebrow: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 }, cardTitle: { marginTop: 4, color: colors.text, fontSize: 14, fontWeight: '900' }, cardVs: { color: colors.volt }, cardDate: { marginTop: 4, color: colors.textMuted, fontSize: 8 },
  emptyHero: { minHeight: 250, justifyContent: 'center', padding: 24, borderRadius: 30, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border, gap: 10 }, emptyEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, emptyTitle: { maxWidth: 320, color: colors.text, fontSize: 29, lineHeight: 30, fontWeight: '900', letterSpacing: -1.2 }, emptyText: { maxWidth: 330, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  emptyList: { padding: 18, borderRadius: 20, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, emptyListText: { color: colors.textMuted, fontSize: 11 }, listSkeleton: { height: 170, borderRadius: 24, backgroundColor: '#10161D' }, disabled: { opacity: 0.45 }, pressed: { opacity: 0.75 },
});
