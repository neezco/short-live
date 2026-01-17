import type { CacheState } from "../types";
import { interpolate } from "../utils/interpolate";
import { safeGetMemoryUsage } from "../utils/safe-memory-usage";

/**
 * Represents the calculated optimal sweep parameters based on current cache usage.
 */
export interface OptimalSweepParams {
  /** The optimal interval in milliseconds between sweep operations. */
  sweepIntervalMs: number;

  /** The optimal maximum time budget in milliseconds for a sweep cycle. */
  sweepTimeBudgetMs: number;
}

/**
 * Calculates the optimal sweep parameters (interval and time budget) based on the current cache usage.
 *
 * This function determines a usage ratio by preferring memory usage if available (via `safeGetMemoryUsage`),
 * otherwise falling back to the cache size ratio. It then interpolates between optimal and worst-case
 * values for sweep interval and time budget, where a ratio of 0 (low usage) favors optimal performance,
 * and a ratio of 1 (high usage) favors worst-case conservative settings.
 *
 * @param state - The current cache state containing configuration and store information.
 * @returns An object containing the calculated optimal sweep interval and time budget.
 *
 * @example
 * ```typescript
 * const params = calculateOptimalSweepParams(cacheState);
 * console.log(`Next sweep in ${params.sweepIntervalMs}ms with budget ${params.sweepTimeBudgetMs}ms`);
 * ```
 */
export const calculateOptimalSweepParams = (state: CacheState): OptimalSweepParams => {
  const memUsage = safeGetMemoryUsage();
  let ratio = 0;
  if (memUsage) {
    ratio = memUsage.heapUsed / (state.maxSizeMB * 1024 * 1024);
  } else {
    ratio = state.store.size / state.maxSize;
  }
  ratio = Math.min(1, Math.max(0, ratio));

  const sweepIntervalMs = interpolate({
    value: ratio,
    fromStart: 0,
    fromEnd: 1,
    toStart: state.optimalSweepIntervalMs,
    toEnd: state.worstSweepIntervalMs,
  });

  const sweepTimeBudgetMs = interpolate({
    value: ratio,
    fromStart: 0,
    fromEnd: 1,
    // toStart: state.optimalSweepTimeBudgetMs,
    toStart: 0,
    toEnd: state.worstSweepTimeBudgetMs,
  });

  return {
    sweepIntervalMs,
    sweepTimeBudgetMs,
  };
};
