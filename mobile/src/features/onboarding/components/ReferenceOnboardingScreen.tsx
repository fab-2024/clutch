import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  Apple,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Gamepad2,
  Mail,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import { selectionFeedback } from '@/src/lib/feedback';
import { fonts } from '@/src/theme';

import { GAMES } from '../constants';
import { GAME_BACKGROUNDS } from '../gameBackgrounds';
import type { GameId, OnboardingDraft, TeamOrganization } from '../types';
import GameLogo from './GameLogo';
import PrimaryButton from './OnboardingPrimaryButton';
import TeamLogo from './TeamLogo';

type OAuthProvider = 'apple' | 'google' | 'discord';

type Props = {
  draft: OnboardingDraft;
  error: string | null;
  gameReady: boolean;
  loadingTeams: boolean;
  organizations: TeamOrganization[];
  preview: boolean;
  step: number;
  teamReady: boolean;
  onAdvance: () => void;
  onBack: () => void;
  onEmail: () => void;
  onGameNext: () => void;
  onOAuth: (provider: OAuthProvider) => void;
  onSelectGame: (game: GameId) => void;
  onSelectMissingGame: (value: string) => void;
  onSelectMissingTeam: (name: string) => void;
  onSelectTeam: (organization: TeamOrganization) => void;
  onTeamNext: () => void;
};

const RIVALRY_MARK = require('../../../../assets/brand/griff-rivalry-mark.png');
const CAMP_BACKGROUND = require('../../../../assets/onboarding/camp-arena-kc-m8-v3.png');
const FRAG_REWARD_PANEL = require('../../../../assets/onboarding/frag-reward-hologram-v2.png');
const PURPLE_ARENA = require('../../../../assets/onboarding/purple-arena-v2.png');
const RELIC_BACKGROUND = require('../../../../assets/onboarding/relic-reactor-clean-v2.png');
const TEAM_CROWD = require('../../../../assets/onboarding/team-crowd-v2.png');
const ETERNAL_RANK = require('../../../../assets/rank/eternel-transparent.png');

const TEAM_OPTIONS = [
  { name: 'Karmine Corp', tag: 'KC', accent: '#24A6FF', scale: .72, tint: undefined },
  { name: 'Fnatic', tag: 'FNC', accent: '#FF6318', scale: .72, tint: undefined },
  { name: 'G2 Esports', tag: 'G2', accent: '#F3F5F7', scale: .82, tint: undefined },
  { name: 'Team Vitality', tag: 'VIT', accent: '#FFE500', scale: .84, tint: undefined },
  { name: 'Gentle Mates', tag: 'M8', accent: '#FFFFFF', scale: .74, tint: null },
  { name: 'Team BDS', tag: 'BDS', accent: '#F20A53', scale: .72, tint: undefined },
] as const;

const DISCOVERY_GAMES = [
  { id: 'counter-strike-2', name: 'Counter-Strike 2', code: 'CS2', accent: '#F5A524' },
  { id: 'ea-sports-fc', name: 'EA SPORTS FC', code: 'FC', accent: '#F4F7FA' },
  { id: 'overwatch-2', name: 'Overwatch 2', code: 'OW', accent: '#F99E35' },
  { id: 'rainbow-six-siege', name: 'Rainbow Six Siege', code: 'R6', accent: '#DCE3E8' },
  { id: 'fortnite', name: 'Fortnite', code: 'FN', accent: '#35B8FF' },
  { id: 'other', name: 'Autre', code: '…', accent: '#8795A1' },
] as const;

const GAME_CARD_TONES: Record<GameId, readonly [string, string, string]> = {
  lol: ['rgba(122,36,0,.56)', 'rgba(255,117,0,.28)', 'rgba(26,7,0,.20)'],
  valorant: ['rgba(230,0,63,.38)', 'rgba(66,0,63,.10)', 'rgba(255,0,104,.30)'],
  rocket_league: ['rgba(0,84,220,.24)', 'rgba(0,188,255,.04)', 'rgba(0,62,170,.24)'],
};

export default function ReferenceOnboardingScreen(props: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {props.step === 1 ? <CampScreen onNext={props.onAdvance} /> : null}
      {props.step === 2 ? <FragScreen onBack={props.onBack} onNext={props.onAdvance} /> : null}
      {props.step === 3 ? <RelicScreen onBack={props.onBack} onNext={props.onAdvance} /> : null}
      {props.step === 4 ? <GameScreen {...props} /> : null}
      {props.step === 5 ? <TeamScreen {...props} /> : null}
      {props.step === 6 ? <AuthScreen {...props} /> : null}
    </View>
  );
}

function CampScreen({ onNext }: { onNext: () => void }) {
  const [selectedTeam, setSelectedTeam] = useState<'KC' | 'M8'>('KC');
  return (
    <ScreenFrame background={CAMP_BACKGROUND} step={1}>
      <View style={styles.pageChrome}>
        <TopBar />
        <Title>CHOISIS{`\n`}TON CAMP.</Title>
      </View>
      <View style={styles.campPlateControls}>
        <View accessibilityLabel="Match Karmine Corp contre Gentle Mates" style={styles.campCards}>
          <CampCard accent="#00C9FF" active={selectedTeam === 'KC'} name="Karmine Corp" onPress={() => setSelectedTeam('KC')} tag="KC" />
          <CampCard accent="#FF804E" active={selectedTeam === 'M8'} name="Gentle Mates" onPress={() => setSelectedTeam('M8')} tag="M8" />
        </View>
        <PrimaryButton label="Continuer" onPress={onNext} tone="coral" />
        <Progress step={1} />
      </View>
    </ScreenFrame>
  );
}

function CampCard({ accent, active, name, onPress, tag }: { accent: string; active: boolean; name: string; onPress: () => void; tag: string }) {
  return (
    <Pressable
      accessibilityLabel={`Choisir ${name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => { selectionFeedback(); onPress(); }}
      style={({ pressed }) => [styles.campCard, active && { borderColor: accent, boxShadow: `0 0 18px ${accent}` }, pressed && styles.pressed]}
    >
      <LinearGradient colors={[`${accent}33`, 'rgba(3,9,17,.96)']} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <TeamLogo accent={accent} contentScale={.9} frameless name={name} size={82} tag={tag} tintColor={name === 'Gentle Mates' ? null : undefined} />
      <Text style={styles.campTag}>{tag}</Text>
      <View style={[styles.choiceBadge, active && { backgroundColor: accent, borderColor: accent }]}>
        <Text style={[styles.choiceBadgeText, active && styles.choiceBadgeTextActive]}>{active ? '✓' : '+'}</Text>
      </View>
    </Pressable>
  );
}

function FragScreen({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <ScreenFrame background={PURPLE_ARENA} step={2}>
      <LinearGradient colors={['rgba(13,5,54,.06)', 'rgba(16,4,55,.12)', 'rgba(7,2,28,.86)']} locations={[0, .58, 1]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View style={styles.pageChrome}>
        <TopBar onBack={onBack} />
        <Title>CHAQUE BON{`\n`}CALL COMPTE.</Title>
        <View style={styles.rewardStage}>
          <Image resizeMode="contain" source={RIVALRY_MARK} style={[styles.rewardArenaMark, styles.rewardArenaMarkLeft]} tintColor="#9B66FF" />
          <Image resizeMode="contain" source={RIVALRY_MARK} style={[styles.rewardArenaMark, styles.rewardArenaMarkRight]} tintColor="#9B66FF" />
          <Image accessibilityLabel="Récompense plus 17 Frags" resizeMode="contain" source={FRAG_REWARD_PANEL} style={styles.rewardPanelImage} />
          <LinearGradient colors={['rgba(24,31,61,.98)', 'rgba(4,10,31,.98)']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.rankCard}>
            <Image accessibilityLabel="Grade Éternel" resizeMode="contain" source={ETERNAL_RANK} style={styles.rankEmblem} />
            <View style={styles.rankMove}><Text style={styles.rankOld}>#12</Text><ArrowRight color="#B9A8F8" size={25} /><Text style={styles.rankNew}>#5</Text></View>
          </LinearGradient>
        </View>
        <PrimaryButton label="Continuer" onPress={onNext} tone="purple" />
        <Progress step={2} />
      </View>
    </ScreenFrame>
  );
}

function RelicScreen({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <ScreenFrame background={RELIC_BACKGROUND} step={3}>
      <LinearGradient colors={['rgba(1,13,35,.18)', 'rgba(1,9,23,0)', 'rgba(1,7,17,.54)']} locations={[0, .6, 1]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View style={styles.pageChrome}>
        <TopBar onBack={onBack} />
        <Title>PROGRESSEZ{`\n`}ENSEMBLE.</Title>
      </View>
      <View style={styles.relicControls}>
        <View accessibilityLabel="Relique collective au niveau 68 pour cent" style={styles.relicMetricCard}>
          <View style={styles.relicPercent}>
            <Svg height={76} viewBox="0 0 76 76" width={76}>
              <Circle cx="38" cy="38" fill="rgba(3,14,27,.72)" r="30" stroke="rgba(255,255,255,.16)" strokeWidth="8" />
              <Circle cx="38" cy="38" fill="none" originX="38" originY="38" r="30" rotation={-90} stroke="#E7FF38" strokeDasharray={[128, 189]} strokeLinecap="round" strokeWidth="8" />
            </Svg>
            <Text style={styles.relicPercentText}>68 %</Text>
          </View>
          <View accessibilityLabel="Quatre supporters de la relique" style={styles.relicSupporters}>
            {[
              ['void-dragon', 'Nova'],
              ['gale-agent', 'Vector'],
              ['octane-stripe', 'Ember'],
              ['orbital-orange', 'Byte'],
            ].map(([avatarId, label], index) => (
              <View key={avatarId} style={[styles.relicSupporter, index > 0 && styles.relicSupporterOverlap]}>
                <PlayerAvatar avatarId={avatarId} label={label} size={46} />
              </View>
            ))}
          </View>
        </View>
        <PrimaryButton label="Choisir mon jeu" onPress={onNext} tone="lime" />
        <Progress step={3} />
      </View>
    </ScreenFrame>
  );
}

function GameScreen(props: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <ScreenFrame step={4}>
      <LinearGradient colors={['#05080C', '#07101A', '#020509']} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View style={styles.selectionChrome}>
        <TopBar onBack={props.onBack} />
        <Title compact>CHOISIS TON JEU.</Title>
        <View style={styles.gameList}>
          {GAMES.map((game) => {
            const active = props.draft.favoriteGame === game.id;
            const brandColor = game.id === 'lol' ? '#F2D39A' : '#FFFFFF';
            return (
              <Pressable accessibilityLabel={game.name} accessibilityRole="button" accessibilityState={{ selected: active }} key={game.id} onPress={() => props.onSelectGame(game.id)} style={({ pressed }) => [styles.gameCard, { borderColor: `${game.accent}8A` }, active && { borderColor: game.accent, boxShadow: `0 0 16px ${game.accent}` }, pressed && styles.pressed]}>
                <Image resizeMode="cover" source={GAME_BACKGROUNDS[game.id]} style={styles.gameImage} />
                <LinearGradient colors={GAME_CARD_TONES[game.id]} locations={[0, .56, 1]} pointerEvents="none" style={styles.gameScrim} />
                <View style={styles.gameBrand}><GameLogo color={brandColor} game={game.id} size={45} /><Text adjustsFontSizeToFit numberOfLines={2} style={[styles.gameWordmark, { color: brandColor }]}>{game.name.toUpperCase()}</Text></View>
                <Choice active={active} />
              </Pressable>
            );
          })}
        </View>
        <Pressable accessibilityLabel="Je ne vois pas mon jeu" accessibilityRole="button" onPress={() => setSheetOpen(true)} style={({ pressed }) => [styles.missingButton, pressed && styles.pressed]}>
          <Text numberOfLines={1} style={styles.missingButtonText}>{props.draft.missingGame.trim() || 'Je ne vois pas mon jeu'}</Text>
          <ChevronDown color="#D6DFE7" size={22} />
        </Pressable>
        <PrimaryButton disabled={!props.gameReady} label="Continuer" onPress={props.onGameNext} tone="coral" />
        <Progress step={4} />
      </View>
      <GameSheet currentValue={props.draft.missingGame} onClose={() => setSheetOpen(false)} onConfirm={(value) => { props.onSelectMissingGame(value); setSheetOpen(false); }} visible={sheetOpen} />
    </ScreenFrame>
  );
}

function GameSheet({ currentValue, onClose, onConfirm, visible }: { currentValue: string; onClose: () => void; onConfirm: (value: string) => void; visible: boolean }) {
  const known = DISCOVERY_GAMES.find((game) => game.name === currentValue)?.name ?? null;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(known ?? (currentValue.trim() ? 'Autre' : null));
  const [custom, setCustom] = useState(known ? '' : currentValue);

  useEffect(() => {
    if (!visible) return;
    const nextKnown = DISCOVERY_GAMES.find((game) => game.name === currentValue)?.name ?? null;
    setQuery('');
    setSelected(nextKnown ?? (currentValue.trim() ? 'Autre' : null));
    setCustom(nextKnown ? '' : currentValue);
  }, [currentValue, visible]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    if (!normalized) return DISCOVERY_GAMES;
    return DISCOVERY_GAMES.filter((game) => game.id === 'other' || game.name.toLocaleLowerCase('fr').includes(normalized));
  }, [query]);
  const value = selected === 'Autre' ? custom.trim() : selected?.trim() ?? '';

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="overFullScreen" transparent visible={visible}>
      <View style={styles.sheetOverlay}>
        <Pressable accessibilityLabel="Fermer la liste des jeux" accessibilityRole="button" onPress={onClose} style={styles.sheetBackdrop} />
        <View style={styles.sheetRoot}>
          <LinearGradient colors={['#08192B', '#06111E', '#02070C']} pointerEvents="none" style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['bottom']} style={styles.sheetSafe}>
          <View style={styles.sheetHeader}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>Trouve ton jeu</Text>
            <Pressable accessibilityLabel="Fermer la liste des jeux" accessibilityRole="button" onPress={onClose} style={styles.sheetClose}><X color="#FFFFFF" size={20} /></Pressable>
          </View>
          <View style={styles.sheetSearch}><Search color="#91A1AF" size={20} /><TextInput accessibilityLabel="Rechercher un jeu" autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder="Rechercher un jeu" placeholderTextColor="#748391" style={styles.sheetSearchInput} value={query} /></View>
          <ScrollView contentContainerStyle={styles.sheetList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
            {filtered.map((game) => {
              const active = selected === game.name;
              return (
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} key={game.id} onPress={() => { selectionFeedback(); setSelected(game.name); }} style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}>
                  <View style={[styles.sheetGameIcon, { borderColor: `${game.accent}88` }]}><Text style={[styles.sheetGameCode, { color: game.accent }]}>{game.code}</Text></View>
                  <Text style={styles.sheetGameName}>{game.name}</Text>
                  <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
                </Pressable>
              );
            })}
            {selected === 'Autre' ? <TextInput accessibilityLabel="Nom de ton jeu" autoCapitalize="words" autoFocus maxLength={80} onChangeText={setCustom} placeholder="Nom de ton jeu" placeholderTextColor="#748391" style={styles.customGameInput} value={custom} /> : null}
          </ScrollView>
          <PrimaryButton disabled={value.length < 2} label="Valider" onPress={() => onConfirm(value)} tone="blue" />
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

function TeamScreen(props: Props) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const choices = TEAM_OPTIONS
    .map((option) => ({ option, organization: props.organizations.find((organization) => organization.name === option.name) }))
    .filter(({ option }) => !normalizedQuery || `${option.name} ${option.tag}`.toLocaleLowerCase('fr').includes(normalizedQuery));
  const selectedKey = props.draft.favoriteTeamKey ?? props.draft.missingTeam.toLocaleLowerCase('fr');
  const heroChoice = TEAM_OPTIONS.find((option) => selectedKey === (props.organizations.find((organization) => organization.name === option.name)?.key ?? option.name.toLocaleLowerCase('fr'))) ?? TEAM_OPTIONS[0];
  const heroOrganization = props.organizations.find((organization) => organization.name === heroChoice.name);

  return (
    <ScreenFrame background={TEAM_CROWD} step={5}>
      <LinearGradient colors={['rgba(0,35,92,.08)', 'rgba(0,19,48,.48)', 'rgba(1,7,15,.98)']} locations={[0, .43, .78]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View style={styles.selectionChrome}>
        <TopBar onBack={props.onBack} />
        <Title compact>QUI VAS-TU{`\n`}FAIRE GAGNER ?</Title>
        <View style={styles.teamHero}>
          <View style={styles.teamHeroMark}>
            <TeamLogo accent={heroChoice.accent} contentScale={.88} frameless name={heroChoice.name} size={124} tag={heroChoice.tag} tintColor={heroChoice.tint} uri={heroOrganization?.logo} />
          </View>
        </View>
        <View style={styles.teamSearch}><Search color="#B4C2CE" size={20} /><TextInput accessibilityLabel="Rechercher une équipe" autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder="Rechercher une équipe" placeholderTextColor="#9AA9B6" style={styles.teamSearchInput} value={query} /></View>
        <View style={styles.teamGrid}>
          {choices.slice(0, 6).map(({ option, organization }) => {
            const key = organization?.key ?? option.name.toLocaleLowerCase('fr');
            const active = selectedKey === key;
            return (
              <Pressable accessibilityLabel={option.name} accessibilityRole="button" accessibilityState={{ selected: active }} key={option.tag} onPress={() => organization ? props.onSelectTeam(organization) : props.onSelectMissingTeam(option.name)} style={({ pressed }) => [styles.teamCard, active && styles.teamCardActive, pressed && styles.pressed]}>
                <TeamLogo accent={option.accent} contentScale={option.scale} frameless name={option.name} size={74} tag={option.tag} tintColor={option.tint} uri={organization?.logo} />
                <Text style={styles.teamTag}>{option.tag}</Text>
                <Choice active={active} compact />
              </Pressable>
            );
          })}
          {choices.length === 0 ? <Text style={styles.emptyTeam}>Aucune équipe trouvée.</Text> : null}
        </View>
        {props.loadingTeams ? <ActivityIndicator color="#27A9FF" size="small" style={styles.teamLoader} /> : null}
        {props.error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{props.error}</Text> : null}
        <PrimaryButton disabled={!props.preview && (!props.teamReady || props.loadingTeams)} label="Continuer" onPress={props.onTeamNext} tone="blue" />
        <Progress step={5} />
      </View>
    </ScreenFrame>
  );
}

function AuthScreen(props: Props) {
  return (
    <ScreenFrame step={6}>
      <LinearGradient colors={['#03080C', '#0B0A0A', '#020406']} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.copperGlow} />
      <View style={styles.authChrome}>
        <TopBar onBack={props.onBack} />
        <Title compact>TA SAISON{`\n`}COMMENCE.</Title>
        <View style={styles.authAvatarStage}>
          <LinearGradient colors={['#E09B6C', '#8D4F2E']} style={styles.avatarRing}><View style={styles.avatarInner}><PlayerAvatar avatarId="gale-agent" label="Vector" size={208} /></View></LinearGradient>
          <Text style={styles.avatarName}>VECTOR</Text>
        </View>
        <ProviderButton icon={<Apple color="#050A0D" fill="#050A0D" size={25} />} label="Continuer avec Apple" onPress={() => props.onOAuth('apple')} />
        <View style={styles.providerIcons}>
          <ProviderIcon accessibilityLabel="Continuer avec Google" onPress={() => props.onOAuth('google')}><Text style={styles.googleGlyph}>G</Text></ProviderIcon>
          <ProviderIcon accessibilityLabel="Continuer avec Discord" onPress={() => props.onOAuth('discord')}><Gamepad2 color="#5865F2" size={29} strokeWidth={2.4} /></ProviderIcon>
          <ProviderIcon accessibilityLabel="Continuer avec une adresse e-mail" onPress={props.onEmail}><Mail color="#FFFFFF" size={26} /></ProviderIcon>
        </View>
        {props.error ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{props.error}</Text> : null}
        <View style={styles.securityRow}><ShieldCheck color="#9AA5AE" size={16} /><Text style={styles.securityText}>Aucune mise d’argent · privé par défaut</Text></View>
        <Progress step={6} />
      </View>
    </ScreenFrame>
  );
}

function ScreenFrame({ background, children, step }: { background?: ImageSourcePropType; children: ReactNode; step: number }) {
  return (
    <View accessibilityLabel={`Étape ${step} sur 6`} style={styles.screen}>
      {background ? <Image resizeMode="cover" source={background} style={styles.fullBleed} /> : null}
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>{children}</SafeAreaView>
    </View>
  );
}

function TopBar({ onBack }: { onBack?: () => void }) {
  return (
    <View style={styles.topBar}>
      {onBack ? <BackButton accessibilityLabel="Retour à l’étape précédente" onPress={onBack} /> : null}
      <View style={styles.brandLockup}><Image accessibilityLabel="Logo GRIFF" resizeMode="contain" source={RIVALRY_MARK} style={styles.brandMark} /><Text style={styles.brandWord}>GRIFF</Text></View>
    </View>
  );
}

function BackButton({ accessibilityLabel, onPress }: { accessibilityLabel: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" hitSlop={8} onPress={onPress} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
      <LinearGradient colors={['rgba(255,255,255,.18)', 'rgba(5,12,22,.72)']} pointerEvents="none" style={styles.backButtonFill} />
      <ArrowLeft color="#FFFFFF" size={22} strokeWidth={2.4} />
    </Pressable>
  );
}

function Title({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <Text adjustsFontSizeToFit accessibilityRole="header" numberOfLines={2} style={[styles.title, compact && styles.titleCompact]}>{children}</Text>;
}

function Choice({ active, compact = false }: { active: boolean; compact?: boolean }) {
  return <View style={[styles.choice, compact && styles.choiceCompact, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{active ? '✓' : ''}</Text></View>;
}

function Progress({ step }: { step: number }) {
  return <View style={styles.progress}>{[1, 2, 3, 4, 5, 6].map((index) => <View key={index} style={[styles.progressSegment, index === step && styles.progressSegmentActive]} />)}</View>;
}

function ProviderButton({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.providerButton, pressed && styles.pressed]}>{icon}<Text style={styles.providerButtonText}>{label}</Text></Pressable>;
}

function ProviderIcon({ accessibilityLabel, children, onPress }: { accessibilityLabel: string; children: ReactNode; onPress: () => void }) {
  return <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.providerIcon, pressed && styles.pressed]}>{children}</Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020509' },
  screen: { flex: 1, overflow: 'hidden', backgroundColor: '#020509' },
  safeArea: { flex: 1 },
  fullBleed: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  pageChrome: { flex: 1, paddingHorizontal: 16 },
  selectionChrome: { flex: 1, gap: 9, paddingHorizontal: 15 },
  authChrome: { flex: 1, paddingHorizontal: 16 },
  topBar: { height: 51, alignItems: 'center', justifyContent: 'center' },
  brandLockup: { height: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  brandMark: { width: 53, height: 47 },
  brandWord: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 37, lineHeight: 40, fontStyle: 'italic', letterSpacing: .4 },
  backButton: { position: 'absolute', zIndex: 20, left: 0, width: 41, height: 41, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,255,255,.38)', backgroundColor: 'rgba(3,10,18,.64)', boxShadow: '0 6px 18px rgba(0,0,0,.38)' },
  backButtonFill: { ...StyleSheet.absoluteFill },
  title: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 58, lineHeight: 51, fontStyle: 'italic', letterSpacing: -.8, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.78)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10 },
  titleCompact: { fontSize: 49, lineHeight: 44 },
  campPlateControls: { position: 'absolute', zIndex: 10, left: 15, right: 15, bottom: 8 },
  campCards: { height: 162, flexDirection: 'row', gap: 13, marginBottom: 25 },
  campCard: { flex: 1, height: 162, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 23, borderWidth: 2, borderColor: 'rgba(210,225,236,.25)', backgroundColor: 'rgba(2,8,17,.94)' },
  campTag: { marginTop: -5, color: '#FFFFFF', fontFamily: fonts.display, fontSize: 30, lineHeight: 32 },
  choiceBadge: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#B1BEC9', backgroundColor: '#0A131C' },
  choiceBadgeText: { color: '#C8D3DC', fontFamily: fonts.bold, fontSize: 15 },
  choiceBadgeTextActive: { color: '#061018' },
  rewardStage: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 21, paddingBottom: 22 },
  rewardArenaMark: { position: 'absolute', top: 54, width: 42, height: 37, opacity: .9 },
  rewardArenaMarkLeft: { left: 13 },
  rewardArenaMarkRight: { right: 13, transform: [{ scaleX: -1 }] },
  rewardPanelImage: { width: '100%', height: 185 },
  rankCard: { width: '100%', height: 92, flexDirection: 'row', alignItems: 'center', paddingLeft: 13, paddingRight: 24, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(92,101,170,.82)', boxShadow: '0 12px 26px rgba(0,0,0,.34)' },
  rankEmblem: { width: 78, height: 78 },
  rankMove: { flexDirection: 'row', alignItems: 'center', gap: 13, marginLeft: 26 },
  rankOld: { color: '#AAA4C9', fontFamily: fonts.display, fontSize: 33, lineHeight: 35 },
  rankNew: { color: '#D742FF', fontFamily: fonts.display, fontSize: 36, lineHeight: 38, textShadowColor: 'rgba(215,66,255,.52)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  relicControls: { position: 'absolute', zIndex: 10, left: 15, right: 15, bottom: 8 },
  relicMetricCard: { height: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 16, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(96,162,229,.68)', backgroundColor: 'rgba(3,14,29,.93)', boxShadow: '0 12px 28px rgba(0,0,0,.48)' },
  relicPercent: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  relicPercentText: { position: 'absolute', color: '#FFFFFF', fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 25 },
  relicSupporters: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 2 },
  relicSupporter: { width: 50, height: 50, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 25, borderWidth: 2, borderColor: '#D7E6F3', backgroundColor: '#07111A' },
  relicSupporterOverlap: { marginLeft: -8 },
  gameList: { flex: 1, gap: 8 },
  gameCard: { flex: 1, minHeight: 102, overflow: 'hidden', justifyContent: 'center', borderRadius: 19, borderWidth: 1.5, borderColor: '#324B62', backgroundColor: '#101821' },
  gameImage: { position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 },
  gameScrim: { position: 'absolute', inset: 0, zIndex: 1 },
  gameBrand: { zIndex: 2, width: '65%', marginLeft: 18, flexDirection: 'row', alignItems: 'center', gap: 11 },
  gameWordmark: { flex: 1, color: '#FFFFFF', fontFamily: fonts.display, fontSize: 26, lineHeight: 24, textShadowColor: '#000000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 7 },
  missingButton: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 17, borderWidth: 1, borderColor: '#8294A5', backgroundColor: 'rgba(4,10,18,.94)' },
  missingButtonText: { maxWidth: '76%', color: '#FFFFFF', fontFamily: fonts.medium, fontSize: 16 },
  choice: { position: 'absolute', zIndex: 3, top: 12, right: 12, width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1.4, borderColor: '#D8E3EB', backgroundColor: 'rgba(5,12,20,.76)' },
  choiceCompact: { top: 8, right: 8, width: 24, height: 24, borderRadius: 12 },
  choiceActive: { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  choiceText: { color: '#1389E8', fontFamily: fonts.bold, fontSize: 18, lineHeight: 19 },
  choiceTextActive: { color: '#1389E8' },
  teamSearch: { height: 49, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.4, borderColor: '#168FFF', backgroundColor: 'rgba(3,21,40,.96)', boxShadow: '0 0 15px rgba(13,124,255,.3)' },
  teamSearchInput: { flex: 1, color: '#FFFFFF', fontFamily: fonts.body, fontSize: 15 },
  teamHero: { height: 126, alignItems: 'center', justifyContent: 'center' },
  teamHeroMark: { opacity: .76, transform: [{ rotate: '-2deg' }, { skewX: '-5deg' }, { scaleY: .93 }] },
  teamGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', justifyContent: 'space-between', gap: 9 },
  teamCard: { position: 'relative', width: '31.6%', height: '43%', minHeight: 107, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: '#2B4660', backgroundColor: 'rgba(3,13,25,.94)' },
  teamCardActive: { borderWidth: 2, borderColor: '#49A8FF', backgroundColor: 'rgba(3,20,38,.98)', boxShadow: '0 0 20px rgba(43,145,255,.62)' },
  teamTag: { marginTop: -2, color: '#FFFFFF', fontFamily: fonts.displayBold, fontSize: 18 },
  emptyTeam: { width: '100%', color: '#AAB7C2', fontFamily: fonts.medium, textAlign: 'center' },
  teamLoader: { position: 'absolute', bottom: 112, alignSelf: 'center' },
  errorText: { color: '#FF8D97', fontFamily: fonts.medium, fontSize: 12, textAlign: 'center' },
  copperGlow: { position: 'absolute', top: 180, left: '7%', width: '86%', height: 430, borderRadius: 220, backgroundColor: 'rgba(190,91,45,.18)', boxShadow: '0 0 80px rgba(190,91,45,.25)' },
  authAvatarStage: { flex: 1, minHeight: 265, alignItems: 'center', justifyContent: 'center' },
  avatarRing: { width: 224, height: 224, alignItems: 'center', justifyContent: 'center', borderRadius: 112, padding: 5, boxShadow: '0 0 34px rgba(209,122,72,.42)' },
  avatarInner: { overflow: 'hidden', width: 214, height: 214, borderRadius: 107, backgroundColor: '#061018' },
  avatarName: { marginTop: 10, color: '#FFFFFF', fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: 1.8 },
  providerButton: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 17, backgroundColor: '#FFFFFF' },
  providerButtonText: { color: '#050A0D', fontFamily: fonts.bold, fontSize: 17 },
  providerIcons: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 16 },
  providerIcon: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 30, borderWidth: 1, borderColor: '#314454', backgroundColor: '#08121A' },
  googleGlyph: { color: '#4285F4', fontFamily: fonts.bold, fontSize: 26 },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 'auto' },
  securityText: { color: '#909CA6', fontFamily: fonts.medium, fontSize: 10 },
  progress: { height: 29, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  progressSegment: { width: 30, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.26)' },
  progressSegmentActive: { backgroundColor: '#FFFFFF' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,.56)' },
  sheetRoot: { height: '64%', overflow: 'hidden', borderTopLeftRadius: 27, borderTopRightRadius: 27, backgroundColor: '#06111E' },
  sheetSafe: { flex: 1, gap: 8, paddingHorizontal: 16, paddingTop: 7, paddingBottom: 8 },
  sheetHeader: { height: 42, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 23 },
  sheetClose: { position: 'absolute', right: 0, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#122536' },
  sheetSearch: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#258CFF', backgroundColor: '#0A2032' },
  sheetSearchInput: { flex: 1, color: '#FFFFFF', fontFamily: fonts.body, fontSize: 16 },
  sheetScroll: { flex: 1 },
  sheetList: { paddingBottom: 4 },
  sheetRow: { height: 49, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#284255' },
  sheetGameIcon: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, backgroundColor: '#0D1D2A' },
  sheetGameCode: { fontFamily: fonts.display, fontSize: 17 },
  sheetGameName: { flex: 1, color: '#FFFFFF', fontFamily: fonts.medium, fontSize: 15 },
  radio: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1.5, borderColor: '#81909D' },
  radioActive: { borderColor: '#208CFF' },
  radioDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#208CFF' },
  customGameInput: { height: 50, marginTop: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#258CFF', color: '#FFFFFF', fontFamily: fonts.body, fontSize: 15, backgroundColor: '#0A2032' },
  disabled: { opacity: .55 },
  pressed: { opacity: .75 },
});
