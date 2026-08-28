import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GriffLockup } from '@/src/components/brand/GriffLogo';
import { Screen } from '@/src/components/layout/Screen';
import { publicAppUrl } from '@/src/config/release';
import { colors, radius, spacing, typography } from '@/src/theme';

import { acceptDuel, cancelDuel, loadDuelInvitation, loadDuelResult } from '../api';
import type { DuelInvitation, DuelResult, DuelStatus } from '../types';

export default function DuelInvitationScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [duel, setDuel] = useState<DuelInvitation | null>(null);
  const [result, setResult] = useState<DuelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<'accept' | 'cancel' | 'share' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!token) {
      setError('Cette invitation est incomplète.');
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const invitation = await loadDuelInvitation(token);
      setDuel(invitation);
      if (invitation.statut === 'termine' && invitation.moi_role !== 'visiteur') {
        setResult(await loadDuelResult(invitation.match_id));
      } else {
        setResult(null);
      }
    } catch (caught) {
      setDuel(null);
      setResult(null);
      setError(errorMessage(caught, 'Impossible de charger cette invitation.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const canAccept = Boolean(
    duel?.statut === 'en_attente'
      && (duel.moi_role === 'cible' || (!duel.ciblee && duel.moi_role === 'visiteur'))
      && duel.mon_prono?.choix === duel.choix_oppose,
  );
  const wrongCamp = Boolean(
    duel?.statut === 'en_attente'
      && duel.moi_role === 'visiteur'
      && duel.mon_prono
      && duel.mon_prono.choix !== duel.choix_oppose,
  );
  const invitationUrl = useMemo(
    () => token ? publicAppUrl(`/c/${encodeURIComponent(token)}`) ?? '' : '',
    [token],
  );

  async function onAccept() {
    if (!duel || busy) return;
    setBusy('accept'); setError(null); setMessage(null);
    try {
      await acceptDuel(duel.token);
      setMessage('Duel accepté. Les deux camps sont verrouillés.');
      await load();
    } catch (caught) {
      setError(errorMessage(caught, 'Le duel n’a pas pu être accepté.'));
    } finally { setBusy(null); }
  }

  async function onCancel() {
    if (!duel || busy) return;
    setBusy('cancel'); setError(null); setMessage(null);
    try {
      await cancelDuel(duel.token);
      setMessage('Invitation annulée.');
      await load();
    } catch (caught) {
      setError(errorMessage(caught, 'Le duel n’a pas pu être annulé.'));
    } finally { setBusy(null); }
  }

  async function onShare() {
    if (!duel || busy) return;
    if (!invitationUrl) {
      setError('Le domaine HTTPS public doit être configuré avant de partager cette invitation.');
      return;
    }
    setBusy('share'); setError(null); setMessage(null);
    const shareText = `${duel.createur_pseudo} te défie sur ${duel.tag_a} vs ${duel.tag_b}. Rejoins le camp ${duel.tag_oppose} : ${invitationUrl}`;
    try {
      if (Platform.OS === 'web' && globalThis.navigator?.clipboard) {
        await globalThis.navigator.clipboard.writeText(invitationUrl);
        setMessage('Lien d’invitation copié.');
      } else {
        await Share.share({ message: shareText, url: invitationUrl });
        setMessage('Invitation prête à être partagée.');
      }
    } catch {
      setMessage(`Copie ce lien : ${invitationUrl}`);
    } finally { setBusy(null); }
  }

  function openMatch() {
    if (!duel) return;
    router.push({ pathname: '/match/[id]', params: { id: duel.match_id, duel: duel.token } });
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
      >
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/social/duels')} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>← DÉFIS</Text>
          </Pressable>
          <GriffLockup width={92} />
        </View>

        {loading ? <View style={styles.skeleton} /> : null}
        {error ? <Notice tone="error" text={error} /> : null}
        {message ? <Notice tone="success" text={message} /> : null}

        {duel ? (
          <>
            <View style={styles.hero}>
              <View style={styles.blueGlow} /><View style={styles.redGlow} />
              <View style={styles.heroTop}>
                <Text style={styles.meta}>{gameLabel(duel.jeu)} · {duel.evenement} · BO{duel.format}</Text>
                <Status status={duel.statut} />
              </View>
              <View style={styles.marketPill}><View style={styles.marketDot} /><Text style={styles.marketText}>CLASSÉ · {duel.marche_libelle.toUpperCase()}</Text></View>
              <Text style={styles.kicker}>{duel.statut === 'termine' ? 'VERDICT DU DUEL' : 'INVITATION AU FACE-À-FACE'}</Text>
              <View style={styles.faceoff}>
                <Fighter pseudo={duel.createur_pseudo} tag={choiceTag(duel, duel.createur_choix)} role="CHALLENGER" />
                <View style={styles.vsBlock}><Text style={styles.vs}>VS</Text><View style={styles.vsLine} /></View>
                <Fighter pseudo={duel.accepteur_pseudo || duel.cible_pseudo || 'PLACE LIBRE'} tag={duel.tag_oppose} role={duel.cible_pseudo && !duel.accepteur_pseudo ? 'CIBLÉ' : 'RIVAL'} right />
              </View>
              <Text style={styles.date}>{formatDate(duel.debut)}</Text>
              {duel.statut === 'termine' && duel.score_a != null && duel.score_b != null ? (
                <Text style={styles.matchScore}>{duel.tag_a} {duel.score_a} — {duel.score_b} {duel.tag_b}</Text>
              ) : null}
            </View>

            {result ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultEyebrow}>RIVALITÉ</Text>
                <Text style={styles.resultTitle}>{result.moi_gagne ? 'TU PRENDS CE ROUND.' : 'TON RIVAL PREND CE ROUND.'}</Text>
                <Text style={styles.resultScore}>{result.score_moi} — {result.score_adversaire}</Text>
                <Text style={styles.resultMeta}>score cumulé contre {result.adversaire_pseudo}</Text>
              </View>
            ) : null}

            <ActionPanel
              duel={duel}
              canAccept={canAccept}
              wrongCamp={wrongCamp}
              busy={busy}
              invitationUrl={invitationUrl}
              onAccept={() => void onAccept()}
              onCancel={() => void onCancel()}
              onOpenMatch={openMatch}
              onShare={() => void onShare()}
            />

            <View style={styles.rules}>
              <Text style={styles.rulesEyebrow}>RÈGLE DU DUEL</Text>
              <Text style={styles.rulesTitle}>Le même marché classé. Deux camps opposés.</Text>
              <Text style={styles.rulesCopy}>Chaque joueur conserve son vrai call « vainqueur de la série ». Le duel ne crée ni mise ni score caché : le verdict officiel règle les deux en même temps.</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ActionPanel({ duel, canAccept, wrongCamp, busy, invitationUrl, onAccept, onCancel, onOpenMatch, onShare }: {
  duel: DuelInvitation;
  canAccept: boolean;
  wrongCamp: boolean;
  busy: string | null;
  invitationUrl: string;
  onAccept: () => void;
  onCancel: () => void;
  onOpenMatch: () => void;
  onShare: () => void;
}) {
  if (duel.statut === 'expire') return <ClosedPanel title="INVITATION EXPIRÉE" copy="Le match a commencé avant qu’un rival ne rejoigne le duel." />;
  if (duel.statut === 'annule') return <ClosedPanel title="INVITATION ANNULÉE" copy="Ce face-à-face n’est plus disponible." />;
  if (duel.statut === 'termine') return <ClosedPanel title="DUEL TERMINÉ" copy="Le verdict est définitif et reste dans l’historique des deux joueurs." />;
  if (duel.statut === 'accepte') return <ClosedPanel title="DUEL VERROUILLÉ" copy={`${duel.createur_pseudo} et ${duel.accepteur_pseudo || 'son rival'} attendent maintenant le résultat du match.`} />;
  if (duel.ciblee && duel.moi_role === 'visiteur') return <ClosedPanel title="DUEL CIBLÉ" copy={`Cette invitation est réservée à ${duel.cible_pseudo || 'un autre joueur du Cercle'}.`} />;

  if (duel.moi_role === 'createur') {
    return (
      <View style={styles.actionPanel}>
        <Text style={styles.actionEyebrow}>TON INVITATION EST OUVERTE</Text>
        <Text style={styles.actionTitle}>{duel.cible_pseudo ? `${duel.cible_pseudo} a reçu ton défi.` : `Envoie le camp ${duel.tag_oppose} à ton rival.`}</Text>
        <Text numberOfLines={1} style={styles.inviteUrl}>{invitationUrl}</Text>
        <Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={onShare} style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}><Text style={styles.primaryText}>{busy === 'share' ? 'PRÉPARATION…' : 'PARTAGER L’INVITATION'}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={onCancel} style={({ pressed }) => [styles.danger, (pressed || busy) && styles.pressed]}><Text style={styles.dangerText}>{busy === 'cancel' ? 'ANNULATION…' : 'ANNULER LE DUEL'}</Text></Pressable>
      </View>
    );
  }

  if (!duel.mon_prono) {
    return (
      <View style={styles.actionPanel}>
        <Text style={styles.actionEyebrow}>{duel.createur_pseudo.toUpperCase()} T’ATTEND</Text>
        <Text style={styles.actionTitle}>Prends position sur {duel.tag_oppose} pour répondre.</Text>
        <Text style={styles.actionCopy}>Ton pronostic doit être verrouillé avant l’acceptation du duel.</Text>
        <Pressable accessibilityRole="button" onPress={onOpenMatch} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>CHOISIR MON CAMP</Text></Pressable>
      </View>
    );
  }

  if (wrongCamp) {
    return <ClosedPanel title="MÊME CAMP" copy={`Ton pronostic est déjà verrouillé sur ${choiceTag(duel, duel.mon_prono.choix)}. Ce duel exige le camp ${duel.tag_oppose}.`} />;
  }

  return (
    <View style={styles.actionPanel}>
      <Text style={styles.actionEyebrow}>CAMP OPPOSÉ VALIDÉ</Text>
      <Text style={styles.actionTitle}>Tu représentes {duel.tag_oppose}.</Text>
      <Text style={styles.actionCopy}>Une fois accepté, le face-à-face restera verrouillé jusqu’au verdict.</Text>
      <Pressable accessibilityRole="button" disabled={!canAccept || Boolean(busy)} onPress={onAccept} style={({ pressed }) => [styles.primary, (!canAccept || busy) && styles.disabled, pressed && styles.pressed]}><Text style={styles.primaryText}>{busy === 'accept' ? 'VERROUILLAGE…' : 'ACCEPTER LE DUEL'}</Text></Pressable>
    </View>
  );
}

function Fighter({ pseudo, tag, role, right = false }: { pseudo: string; tag: string; role: string; right?: boolean }) {
  return <View style={[styles.fighter, right && styles.fighterRight]}><View style={[styles.fighterMark, right && styles.fighterMarkRight]}><Text style={styles.fighterTag}>{tag}</Text></View><Text numberOfLines={1} style={styles.fighterName}>{pseudo}</Text><Text style={styles.fighterRole}>{role}</Text></View>;
}
function Status({ status }: { status: DuelStatus }) {
  const labels: Record<DuelStatus, string> = { en_attente: 'OUVERT', accepte: 'VERROUILLÉ', termine: 'TERMINÉ', annule: 'ANNULÉ', expire: 'EXPIRÉ' };
  const active = status === 'en_attente' || status === 'accepte';
  return <View style={[styles.status, active && styles.statusActive]}><View style={[styles.statusDot, active && styles.statusDotActive]} /><Text style={[styles.statusText, active && styles.statusTextActive]}>{labels[status]}</Text></View>;
}
function ClosedPanel({ title, copy }: { title: string; copy: string }) { return <View style={styles.closedPanel}><Text style={styles.closedTitle}>{title}</Text><Text style={styles.closedCopy}>{copy}</Text></View>; }
function Notice({ tone, text }: { tone: 'error' | 'success'; text: string }) { return <View style={[styles.notice, tone === 'success' && styles.noticeSuccess]}><Text style={[styles.noticeText, tone === 'success' && styles.noticeSuccessText]}>{text}</Text></View>; }
function choiceTag(duel: DuelInvitation, choice: 'a' | 'b') { return choice === 'a' ? duel.tag_a : duel.tag_b; }
function gameLabel(value: string) { const game = value.toLowerCase(); if (game.includes('lol')) return 'LOL'; if (game.includes('valorant')) return 'VAL'; if (game.includes('cs')) return 'CS2'; return 'ESPORT'; }
function formatDate(value: string) { return new Date(value).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function errorMessage(caught: unknown, fallback: string) { return caught instanceof Error ? caught.message : fallback; }

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', padding: spacing.md, paddingBottom: 110, gap: 16 },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { minHeight: 40, justifyContent: 'center', paddingRight: 14 }, backText: { ...typography.action, color: colors.textMuted, letterSpacing: .5 }, brand: { ...typography.bodyStrong, color: colors.volt, fontSize: 15, letterSpacing: 1.4 },
  skeleton: { height: 340, borderRadius: 30, backgroundColor: '#10161D' },
  notice: { padding: 13, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, noticeSuccess: { backgroundColor: '#0D1A13', borderColor: '#214C32' }, noticeText: { ...typography.body, color: '#FF9AA2' }, noticeSuccessText: { color: colors.success },
  hero: { position: 'relative', overflow: 'hidden', minHeight: 372, padding: 19, borderRadius: 30, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#303A44' }, blueGlow: { position: 'absolute', left: -80, bottom: -65, width: 280, height: 280, borderRadius: 140, backgroundColor: '#123A67', opacity: 0.55 }, redGlow: { position: 'absolute', right: -80, bottom: -65, width: 280, height: 280, borderRadius: 140, backgroundColor: '#5B173C', opacity: 0.5 },
  heroTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, meta: { ...typography.label, flex: 1, color: colors.textMuted, letterSpacing: .35 }, kicker: { ...typography.eyebrow, zIndex: 2, marginTop: 31, color: colors.textMuted, letterSpacing: 1.4, textAlign: 'center' },
  marketPill: { zIndex: 2, alignSelf: 'flex-start', minHeight: 28, marginTop: 13, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: '#17200F', borderWidth: 1, borderColor: '#44511E' }, marketDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.volt }, marketText: { ...typography.label, color: colors.volt, letterSpacing: .35 },
  faceoff: { zIndex: 2, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, fighter: { width: '38%', alignItems: 'flex-start' }, fighterRight: { alignItems: 'flex-end' }, fighterMark: { width: 78, height: 78, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101C27', borderWidth: 1, borderColor: '#315B7A' }, fighterMarkRight: { backgroundColor: '#23121D', borderColor: '#78345A' }, fighterTag: { ...typography.metricSmall, color: colors.text }, fighterName: { ...typography.cardTitle, width: '100%', marginTop: 10, color: colors.text }, fighterRole: { ...typography.eyebrow, marginTop: 3, color: colors.textMuted, letterSpacing: .4 },
  vsBlock: { width: 54, alignItems: 'center' }, vs: { ...typography.metricLarge, color: colors.text, fontSize: 39, lineHeight: 42 }, vsLine: { width: 26, height: 3, marginTop: 6, backgroundColor: colors.volt }, date: { ...typography.caption, zIndex: 2, marginTop: 28, color: colors.textMuted, textAlign: 'center' }, matchScore: { ...typography.cardTitle, zIndex: 2, marginTop: 13, color: colors.text, textAlign: 'center' },
  status: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 999, backgroundColor: '#11161C', borderWidth: 1, borderColor: '#242D35' }, statusActive: { backgroundColor: '#171E0E', borderColor: '#3D491D' }, statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#596570' }, statusDotActive: { backgroundColor: colors.volt }, statusText: { ...typography.label, color: colors.textMuted, letterSpacing: .2 }, statusTextActive: { color: colors.volt },
  actionPanel: { padding: 18, borderRadius: 26, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#313A43', gap: 11 }, actionEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .9 }, actionTitle: { ...typography.sectionTitle, color: colors.text }, actionCopy: { ...typography.body, color: colors.textMuted }, inviteUrl: { ...typography.caption, padding: 11, borderRadius: 12, backgroundColor: '#070B0F', color: colors.textMuted }, primary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.volt }, primaryText: { ...typography.action, color: '#080A0C', letterSpacing: .4 }, danger: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#181014', borderWidth: 1, borderColor: '#47252D' }, dangerText: { ...typography.action, color: '#FF9AA2', letterSpacing: .3 },
  closedPanel: { padding: 19, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 7 }, closedTitle: { ...typography.cardTitle, color: colors.text }, closedCopy: { ...typography.body, color: colors.textMuted },
  resultCard: { padding: 19, borderRadius: 26, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#414D1E', alignItems: 'center' }, resultEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1 }, resultTitle: { ...typography.sectionTitle, marginTop: 9, color: colors.text, textAlign: 'center' }, resultScore: { ...typography.metricLarge, marginTop: 12, color: colors.volt }, resultMeta: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  rules: { padding: 18, borderRadius: 24, backgroundColor: '#090E13', borderWidth: 1, borderColor: colors.border }, rulesEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .8 }, rulesTitle: { ...typography.cardTitle, marginTop: 7, color: colors.text }, rulesCopy: { ...typography.body, marginTop: 7, color: colors.textMuted },
  disabled: { opacity: 0.46 }, pressed: { opacity: 0.75 },
});
