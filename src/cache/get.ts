import type { CacheEntry, CacheState, ENTRY_STATUS, PurgeMode } from "../types";
import { shouldPurge } from "../utils/purge-eval";

import { DELETE_REASON, deleteKey } from "./delete";
import { computeEntryStatus, isFresh, isStale } from "./validators";

/**
 * Internal function that retrieves a value from the cache with its status information.
 * Returns a tuple containing the entry status and the complete cache entry.
 *
 * @param state - The cache state.
 * @param key - The key to retrieve.
 * @param now - Optional timestamp override (defaults to Date.now()).
 * @returns A tuple of [status, entry] if the entry is valid, or [null, undefined] if not found or expired.
 *
 * @internal
 */
export const getWithStatus = (
  state: CacheState,
  key: string,
  purgeMode?: PurgeMode,
  now: number = Date.now(),
): [ENTRY_STATUS | null, CacheEntry | undefined] => {
  const entry = state.store.get(key);

  if (!entry) return [null, undefined];

  const status = computeEntryStatus(state, entry, now);

  if (isFresh(state, status, now)) return [status, entry];

  if (isStale(state, status, now)) {
    const purgeModeToUse = purgeMode ?? state.purgeStaleOnGet;
    if (shouldPurge(purgeModeToUse, state, "get")) {
      deleteKey(state, key, DELETE_REASON.STALE);
    }
    return [status, entry];
  }

  // If it expired, always delete it
  deleteKey(state, key, DELETE_REASON.EXPIRED);

  return [status, undefined];
};

/**
 * Retrieves a value from the cache if the entry is valid.
 * @param state - The cache state.
 * @param key - The key to retrieve.
 * @param now - Optional timestamp override (defaults to Date.now()).
 * @returns The cached value if valid, undefined otherwise.
 *
 * @internal
 */
export const get = (
  state: CacheState,
  key: string,
  purgeMode?: PurgeMode,
  now: number = Date.now(),
): unknown => {
  const [, entry] = getWithStatus(state, key, purgeMode, now);
  return entry ? entry[1] : undefined;
};
