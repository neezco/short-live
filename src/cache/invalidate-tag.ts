import type { CacheState, InvalidateTagOptions } from "../types";

/**
 * Invalidates one or more tags so that entries associated with them
 * become expired or stale from this moment onward.
 *
 * Semantics:
 * - Each tag maintains two timestamps in `state._tags`:
 *   [expiredAt, staleSinceAt].
 * - Calling this function updates one of those timestamps to `_now`,
 *   depending on whether the tag should force expiration or staleness.
 *
 * Rules:
 * - If `asStale` is false (default), the tag forces expiration:
 *   entries created before `_now` will be considered expired.
 * - If `asStale` is true, the tag forces staleness:
 *   entries created before `_now` will be considered stale,
 *   but only if they support a stale window.
 *
 * Behavior:
 * - Each call replaces any previous invalidation timestamp for the tag.
 * - Entries created after `_now` are unaffected.
 *
 * @param state - The cache state containing tag metadata.
 * @param tags - A tag or list of tags to invalidate.
 * @param options.asStale - Whether the tag should mark entries as stale.
 */
export function invalidateTag(
  state: CacheState,
  tags: string | string[],
  options: InvalidateTagOptions = {},

  /** @internal */
  _now: number = Date.now(),
): void {
  const tagList = Array.isArray(tags) ? tags : [tags];
  const asStale = options.asStale ?? false;

  for (const tag of tagList) {
    const currentTag = state._tags.get(tag);

    if (currentTag) {
      // Update existing tag timestamps:
      // index 0 = expiredAt, index 1 = staleSinceAt
      if (asStale) {
        currentTag[1] = _now;
      } else {
        currentTag[0] = _now;
      }
    } else {
      // Initialize new tag entry with appropriate timestamp.
      // If marking as stale, expiredAt = 0 and staleSinceAt = _now.
      // If marking as expired, expiredAt = _now and staleSinceAt = 0.
      state._tags.set(tag, [asStale ? 0 : _now, asStale ? _now : 0]);
    }
  }
}
