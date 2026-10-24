import { describe, expect, it } from 'vitest';
import { THEMES } from '../themes';

type Rgba = [number, number, number, number];

function parseColor(color: string): Rgba {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = hex[1];
    return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)).concat(1) as Rgba;
  }
  const rgba = color.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) throw new Error(`Unsupported color: ${color}`);
  const [r, g, b, a = 1] = rgba[1].split(',').map((part) => Number(part.trim()));
  return [r, g, b, a];
}

/** Composite a possibly translucent color over an opaque backdrop. */
function flatten(color: string, backdrop: string): [number, number, number] {
  const [r, g, b, a] = parseColor(color);
  const [br, bg, bb] = parseColor(backdrop);
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(text: string, background: string, backdrop: string): number {
  const [hi, lo] = [
    luminance(flatten(text, backdrop)),
    luminance(flatten(background, backdrop)),
  ].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// WCAG 2.x AA for normal-size text. Section labels and placeholders are small.
const AA = 4.5;

describe.each(THEMES.map((theme) => [theme.name, theme.vars] as const))('%s theme contrast', (_name, vars) => {
  const canvas = vars['--app-bg-top'];

  it.each(['--text', '--text-muted', '--text-soft'])('%s is readable on panels', (textVar) => {
    expect(contrast(vars[textVar], vars['--surface'], canvas)).toBeGreaterThanOrEqual(AA);
  });

  it.each(['--text', '--text-muted', '--text-soft'])('%s is readable on the canvas', (textVar) => {
    expect(contrast(vars[textVar], canvas, canvas)).toBeGreaterThanOrEqual(AA);
  });
});
