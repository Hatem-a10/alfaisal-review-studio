const FALLBACK = '#5b4bd0';
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

function rgb(value) {
  const match = /^#?([\da-f]{6})$/i.exec(String(value ?? '').trim());
  if (!match) return null;
  return match[1].match(/../g).map(part => Number.parseInt(part, 16));
}

function hex([r, g, b]) {
  return '#' + [r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
}

function linear(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  return 0.2126 * linear(color[0]) + 0.7152 * linear(color[1]) + 0.0722 * linear(color[2]);
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function mix(a, b, weightB) {
  return a.map((channel, index) => channel * (1 - weightB) + b[index] * weightB);
}

function reachContrast(start, target, against, minimum) {
  if (contrast(start, against) >= minimum) return start;
  for (let step = 1; step <= 100; step++) {
    const candidate = mix(start, target, step / 100);
    if (contrast(candidate, against) >= minimum) return candidate;
  }
  return target;
}

/**
 * Derive semantic theme colors from a user's unmodified accent selection.
 * Accent foregrounds meet 4.5:1 against accent fills and selected surfaces;
 * borders/focus rings meet 3:1 against the theme surface.
 */
export function deriveAccent(color, dark = false) {
  const raw = rgb(color) || rgb(FALLBACK);
  const surface = dark ? BLACK : WHITE;
  const textAgainstAccent = contrast(WHITE, raw) >= contrast(BLACK, raw) ? WHITE : BLACK;
  const direction = dark ? WHITE : BLACK;
  const selected = mix(raw, surface, dark ? 0.78 : 0.9);
  // Small margin protects the thresholds from 8-bit channel rounding.
  // Dark cards are tinted lighter than the selected surface, so dark text accents get extra headroom.
  const readable = reachContrast(raw, direction, selected, dark ? 5.4 : 4.6);
  const border = reachContrast(raw, direction, surface, 3.1);
  const hover = reachContrast(raw, textAgainstAccent === WHITE ? BLACK : WHITE, textAgainstAccent, 4.6);
  const fg = hex(textAgainstAccent);
  const textAccent = hex(readable);

  return {
    '--accent': hex(raw),
    '--accent-raw': hex(raw),
    '--accent-fg': fg,
    '--on-accent': fg,
    '--accent-text': textAccent,
    '--accent-secondary': textAccent,
    '--green': textAccent,
    '--accent-bg': hex(selected),
    '--accent-selected': hex(selected),
    '--accent-border': hex(border),
    '--accent-hover': hex(hover),
    '--accent-ring': hex(readable),
    '--accent-contrast': contrast(textAgainstAccent, raw).toFixed(2),
    '--accent-text-contrast': contrast(readable, selected).toFixed(2),
    '--accent-border-contrast': contrast(border, surface).toFixed(2),
    '--accent-hover-contrast': contrast(textAgainstAccent, hover).toFixed(2),
    '--accent-surface-text': hex(direction),
  };
}
