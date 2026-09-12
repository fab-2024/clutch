import { COMMUNITY_FORMS, RELIC_TOTAL_AWAKENING } from '../constants';

// Measured in the module image's normalized 1000 × 1000 artboard.
export const REACTOR_CAVITY = { left: 359, right: 638, top: 234, bottom: 683 } as const;
export type ReactorStage = 1 | 2 | 3 | 4 | 5;

const STAGE_NAMES = [
  { level: 1, name: 'Module', title: 'LE MODULE' },
  { level: 2, name: 'Réacteur', title: 'LE RÉACTEUR' },
  { level: 3, name: 'Cœur d’arène', title: 'LE CŒUR D’ARÈNE' },
  { level: 4, name: 'Citadelle', title: 'LA CITADELLE' },
  { level: 5, name: 'Nexus', title: 'LE NEXUS' },
] as const;

export const REACTOR_STAGES = STAGE_NAMES.map((stage) => ({
  ...stage,
  floor: COMMUNITY_FORMS.find((form) => form.level === stage.level)!.threshold,
  ceiling: COMMUNITY_FORMS.find((form) => form.level === stage.level + 1)?.threshold ?? RELIC_TOTAL_AWAKENING,
}));

export function reactorStageDefinition(stage: ReactorStage) { return REACTOR_STAGES[stage - 1]; }
export function nextReactorStage(stage: ReactorStage): ReactorStage | null { return stage < 5 ? (stage + 1) as ReactorStage : null; }

export function reactorFillRatio(supporters: number, floor: number, ceiling: number) {
  if (![supporters, floor, ceiling].every(Number.isFinite) || ceiling <= floor) return 0;
  return Math.max(0, Math.min(1, (supporters - floor) / (ceiling - floor)));
}

export function reactorLiquidY(ratio: number, cavity: { y: number; height: number } = { y: REACTOR_CAVITY.top, height: REACTOR_CAVITY.bottom - REACTOR_CAVITY.top }) {
  'worklet';
  const safeRatio = Number.isFinite(ratio) ? ratio : 0;
  return cavity.y + cavity.height * (1 - Math.max(0, Math.min(1, safeRatio)));
}

export type ReactorLabState = { stage: ReactorStage; supporters: number; prepared: boolean; running: boolean; evolved: boolean };
export type ReactorLabAction = { type: 'prepare' | 'start' | 'finish' | 'cancel' } | { type: 'reset'; supporters: number };

export function createReactorLabState(supporters = 63): ReactorLabState {
  const safeCount = Math.max(1, Math.min(RELIC_TOTAL_AWAKENING, Number.isFinite(supporters) ? Math.floor(supporters) : 63));
  const stage = [...REACTOR_STAGES].reverse().find((candidate) => safeCount >= candidate.floor)!.level;
  return { stage, supporters: safeCount, prepared: false, running: false, evolved: false };
}

export function reactorLabReducer(state: ReactorLabState, action: ReactorLabAction): ReactorLabState {
  if (action.type === 'reset') return createReactorLabState(action.supporters);
  if (action.type === 'cancel') return { ...state, running: false };
  const next = nextReactorStage(state.stage);
  if (action.type === 'prepare') return !next || state.running || state.prepared ? state : { ...state, supporters: reactorStageDefinition(state.stage).ceiling - 1, prepared: true, evolved: false };
  if (action.type === 'start') return !next || !state.prepared || state.running ? state : { ...state, running: true };
  if (!state.running || !next) return state;
  return { stage: next, supporters: reactorStageDefinition(next).floor, prepared: false, running: false, evolved: true };
}
