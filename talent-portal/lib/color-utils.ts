/**
 * Generate a transparent variant of any CSS color (hex or CSS variable).
 *
 * Replaces the old `color + "12"` hex-alpha concatenation pattern so that
 * CSS custom-property values like `"var(--primary)"` work correctly.
 *
 * @param color  Any valid CSS color value, e.g. `"#1B7340"` or `"var(--primary)"`
 * @param alpha  Opacity from 0 to 1, e.g. `0.07`
 */
export function colorAlpha(color: string, alpha: number): string {
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}
