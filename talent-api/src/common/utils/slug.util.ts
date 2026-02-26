export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateUniqueSlug(text: string, suffix?: string): string {
  const base = generateSlug(text);
  if (suffix) return `${base}-${suffix}`;
  const random = Math.random().toString(36).substring(2, 8);
  return `${base}-${random}`;
}
