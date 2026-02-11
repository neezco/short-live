import { DELETE_REASON, deleteKey } from "../cache/delete";
import { computeEntryStatus, isExpired, isStale } from "../cache/validators";
import { MAX_KEYS_PER_BATCH } from "../defaults";
import { type CacheState } from "../types";

/**
 * Performs a single sweep operation on the cache to remove expired and optionally stale entries.
 * Uses a linear scan with a saved pointer to resume from the last processed key.
 * @param state - The cache state.
 * @param _maxKeysPerBatch - Maximum number of keys to process in this sweep.
 * @returns An object containing statistics about the sweep operation.
 */
export function _sweepOnce(
  state: CacheState,

  /**
   * Maximum number of keys to process in this sweep.
   * @default 1000
   */
  _maxKeysPerBatch: number = MAX_KEYS_PER_BATCH,
): { processed: number; expiredCount: number; staleCount: number; ratio: number } {
  if (!state._sweepIter) {
    state._sweepIter = state.store.entries();
  }

  let processed = 0;
  let expiredCount = 0;
  let staleCount = 0;

  for (let i = 0; i < _maxKeysPerBatch; i++) {
    const next = state._sweepIter.next();

    if (next.done) {
      state._sweepIter = state.store.entries();
      break;
    }

    processed += 1;
    const [key, entry] = next.value;

    const now = Date.now();

    const status = computeEntryStatus(state, entry, now);
    if (isExpired(state, status, now)) {
      deleteKey(state, key, DELETE_REASON.EXPIRED);
      expiredCount += 1;
    } else if (isStale(state, status, now)) {
      staleCount += 1;

      if (state.purgeStaleOnSweep) {
        deleteKey(state, key, DELETE_REASON.STALE);
      }
    }
  }

  const expiredStaleCount = state.purgeStaleOnSweep ? staleCount : 0;
  return {
    processed,
    expiredCount,
    staleCount,
    ratio: processed > 0 ? (expiredCount + expiredStaleCount) / processed : 0,
  };
}
