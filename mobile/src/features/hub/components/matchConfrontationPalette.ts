export type MatchTerritoryPalette = {
  edge: string;
  faceMiddle: string;
  faceTop: string;
  local: string;
  middle: string;
  nearFracture: string;
  outer: string;
};

type Rgb = { blue: number; green: number; red: number };
type Hsl = { hue: number; lightness: number; saturation: number };

export function buildMatchTerritoryPalette(accent: string): MatchTerritoryPalette {
  const source = hexToRgb(accent) ?? { red: 63, green: 136, blue: 255 };
  const hsl = rgbToHsl(source);
  const yellowAccent = hsl.hue >= 40 && hsl.hue <= 70 && hsl.saturation > .42;
  const localHue = hsl.hue >= 8 && hsl.hue <= 35
    ? hsl.hue - 4
    : hsl.hue >= 205 && hsl.hue <= 235
      ? hsl.hue - 3
      : hsl.hue;
  const backgroundHue = yellowAccent ? 26 : localHue;
  const saturation = clamp(Math.max(.78, hsl.saturation * 1.26), 0, 1);
  const localLightness = clamp(
    hsl.lightness > .6 ? hsl.lightness * .74 : hsl.lightness,
    .5,
    .53,
  );
  const local = hslToHex({ hue: localHue, saturation, lightness: localLightness });
  const backgroundLocal = hslToHex({ hue: backgroundHue, saturation, lightness: localLightness });
  const nearFracture = hslToHex({
    hue: backgroundHue,
    saturation,
    lightness: clamp(localLightness + .03, 0, .56),
  });

  return {
    edge: mixHex(local, '#FFFFFF', .43),
    faceMiddle: mixHex(backgroundLocal, '#000000', .91),
    faceTop: mixHex(mixHex(backgroundLocal, '#000000', .86), '#FFFFFF', .08),
    local,
    middle: mixHex(backgroundLocal, '#000000', .67),
    nearFracture,
    outer: mixHex(backgroundLocal, '#000000', .9),
  };
}

function hexToRgb(value: string): Rgb | null {
  const normalized = String(value || '').trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHsl({ blue, green, red }: Rgb): Hsl {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  if (delta === 0) return { hue: 0, saturation: 0, lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue = maximum === r
    ? 60 * (((g - b) / delta) % 6)
    : maximum === g
      ? 60 * ((b - r) / delta + 2)
      : 60 * ((r - g) / delta + 4);
  return { hue: hue < 0 ? hue + 360 : hue, saturation, lightness };
}

function hslToHex({ hue, lightness, saturation }: Hsl) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = normalizedHue / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const [r, g, b] = sector < 1
    ? [chroma, second, 0]
    : sector < 2
      ? [second, chroma, 0]
      : sector < 3
        ? [0, chroma, second]
        : sector < 4
          ? [0, second, chroma]
          : sector < 5
            ? [second, 0, chroma]
            : [chroma, 0, second];
  const offset = lightness - chroma / 2;
  return rgbToHex({
    red: Math.round((r + offset) * 255),
    green: Math.round((g + offset) * 255),
    blue: Math.round((b + offset) * 255),
  });
}

function mixHex(from: string, to: string, amount: number) {
  const start = hexToRgb(from) ?? { red: 0, green: 0, blue: 0 };
  const end = hexToRgb(to) ?? { red: 0, green: 0, blue: 0 };
  const weight = clamp(amount, 0, 1);
  return rgbToHex({
    red: Math.round(start.red + (end.red - start.red) * weight),
    green: Math.round(start.green + (end.green - start.green) * weight),
    blue: Math.round(start.blue + (end.blue - start.blue) * weight),
  });
}

function rgbToHex({ blue, green, red }: Rgb) {
  return `#${[red, green, blue]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
