import type { CacheState } from "../types";

/**
 * Marks one or more tags so that all entries associated with them
 * become invalid according to a configurable timing.
 *
 * @param state - Cache state containing tag metadata.
 * @param tags - Tag or list of tags to invalidate.
 * @param options.delayMs - Optional delay before the tag is marked as expired.
 *   If omitted, expiration happens immediately.
 * @param options.staleWindowMs - Optional window where entries may still be
 *   served as stale after the expiration moment (immediate or delayed by `delayMs`).
 */
export function invalidateTag(
  state: CacheState,
  tags: string | string[],
  options: { delayMs?: number; staleWindowMs?: number } = {},
  _now: number = Date.now(),
): void {
  const tagList = Array.isArray(tags) ? tags : [tags];

  const expiresAt = _now + (options.delayMs ?? 0);
  const staleWindowMs = options.staleWindowMs ?? 0;
  const staleExpiresAt = staleWindowMs > 0 ? expiresAt + staleWindowMs : 0;

  for (const tag of tagList) {
    state._tags.set(tag, [_now, expiresAt, staleExpiresAt]);
  }
}
