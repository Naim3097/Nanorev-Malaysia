// Small validators shared across route handlers. They live here rather than in
// a route.ts because Next only permits HTTP-verb and config exports from those.

/** Commission rates are a fraction: clamp to 0–90% and never NaN. */
export const clampRate = (v: unknown) => Math.min(0.9, Math.max(0, Number(v) || 0))

/** Lowercase, hyphen-safe slug. Returns null when nothing usable remains. */
export function slugify(input: unknown): string | null {
  const clean = String(input ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '-')
  return /[a-z0-9]/.test(clean) ? clean : null
}

/**
 * Copy an allow-list of fields from a request body onto a stored record.
 * Keys absent from the body (or explicitly undefined) are left untouched, so a
 * PATCH-style partial update never blanks a field it didn't mention.
 */
export function assignFields<T extends object>(target: T, source: Partial<T>, keys: readonly (keyof T)[]) {
  for (const k of keys) {
    const v = source[k]
    if (v !== undefined) target[k] = v
  }
}
