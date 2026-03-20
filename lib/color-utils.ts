export function withAlpha(color: string, alpha: number, fallbackColor?: string): string {
  const normalizedAlpha = Math.min(Math.max(alpha, 0), 1);
  const trimmed = color.trim();
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
  }

  const rgbMatch = trimmed.match(/^rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
  }

  return fallbackColor ?? trimmed;
}
