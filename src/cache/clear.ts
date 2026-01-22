import type { CacheState } from "../types";

/**
 * Clears all entries from the cache without invoking callbacks.
 *
 * @note The `onDelete` callback is NOT invoked during a clear operation.
 * This is intentional to avoid unnecessary overhead when bulk-removing entries.
 *
 * @param state - The cache state.
 * @returns void
 */
export const clear = (state: CacheState): void => {
  state.store.clear();
};
