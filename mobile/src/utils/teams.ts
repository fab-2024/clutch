const TEAM_HUES: Record<string, number> = {
  KC: 250,
  G2: 25,
  FNC: 45,
  MKOI: 300,
  VIT: 100,
  BDS: 340,
  TH: 15,
  SK: 205,
  GX: 150,
  RGE: 130,
  NAVI: 60,
  SPR: 215,
  FAZE: 8,
  MOUZ: 0,
  FLC: 160,
  AST: 355,
  SEN: 350,
  DRX: 230,
  FUT: 195,
  M8: 190,
  SLY: 165,
  T1: 10,
  TL: 235,
};

export function teamHue(tag: string, name = '') {
  const normalized = String(tag || '').toUpperCase();
  if (TEAM_HUES[normalized] != null) return TEAM_HUES[normalized];

  let hash = 0;
  for (const char of String(name || tag)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % 360;
}
