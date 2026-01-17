import { sweep } from "../sweep/sweep";
import type { CacheOptions, CacheState } from "../types";

let instanceCount = 0;
const MAX_INSTANCES = 6;

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
  if (instanceCount > MAX_INSTANCES) {
    throw new Error(
      `Too many cache instances have been created (${instanceCount}). Consider using a singleton pattern for a single instance.`,
    );
  }
  if (instanceCount > 1) {
    console.warn(
      `Multiple cache instances detected (${instanceCount}). Consider using a singleton pattern for better performance.`,
    );
  }

  const state: CacheState = {
    store: new Map(),
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
