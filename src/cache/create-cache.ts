import { sweep } from "../sweep/sweep";
import type { CacheOptions, CacheState } from "../types";

let instanceCount = 0;
const INSTANCE_WARNING_THRESHOLD = 99;
const cacheStores: CacheState["store"][] = [];

/**
 * Resets the instance count for testing purposes.
 * This function is intended for use in tests to avoid instance limits.
 */
export const resetInstanceCount = (): void => {
  instanceCount = 0;
};

/**
 * Creates the initial state for the TTL cache.
 * @param options - Configuration options for the cache.
 * @returns The initial cache state.
 */
export const createCache = (options: CacheOptions = {}): CacheState => {
  const {
    onExpire,
    onDelete,
    defaultTtl = 1000 * 60 * 5, // 5 minutes
    maxSize = 100_000,
    maxSizeMB = 512, // MB
    worstSweepIntervalMs = 300,
    optimalSweepIntervalMs = 1000,
    keysPerBatch = 500,
    worstSweepTimeBudgetMs = 40,
    // optimalSweepTimeBudgetMs = 10,
    // sweepExpiredRatio = 0.3,
    defaultStaleTtl = 0,
    purgeStaleOnGet = false,
    purgeStaleOnSweep = false,
    autoStartSweep = true,
  } = options;

  instanceCount++;

  if (instanceCount > INSTANCE_WARNING_THRESHOLD) {
    // TODO: Use a proper logging mechanism
    // TODO: Create documentation for this
    console.warn(
      `Too many instances detected (${instanceCount}). This may indicate a configuration issue; consider minimizing instance creation or grouping keys by expected expiration ranges. See the documentation: https://github.com/neezco/short-live/docs/instances`,
    );
  }

  const indexStore = cacheStores.push(new Map()) - 1;

  const state: CacheState = {
    store: cacheStores[indexStore]!,
    _sweepIter: null,
    currentSize: 0,
    processMemory: false,
    onExpire,
    onDelete,
    maxSizeMB,
    maxSize,
    defaultTtl,
    defaultStaleTtl,
    worstSweepTimeBudgetMs,
    // optimalSweepTimeBudgetMs,
    // sweepExpiredRatio,
    get worstSweepIntervalMs() {
      return worstSweepIntervalMs * instanceCount;
    },
    get optimalSweepIntervalMs() {
      return optimalSweepIntervalMs * instanceCount;
    },
    keysPerBatch,
    purgeStaleOnGet,
    purgeStaleOnSweep,
    autoStartSweep,
  };

  // Start the sweep process
  if (autoStartSweep) {
    void sweep(state);
  }

  return state;
};
