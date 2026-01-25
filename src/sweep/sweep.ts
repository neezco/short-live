import { _instancesCache } from "../cache/create-cache";
import {
  MAX_KEYS_PER_BATCH,
  OPTIMAL_SWEEP_INTERVAL,
  OPTIMAL_SWEEP_TIME_BUDGET_IF_NOTE_METRICS_AVAILABLE,
} from "../defaults";
import type { CacheState } from "../types";
import { monitor } from "../utils/start-monitor";

import { _batchUpdateExpiredRatio } from "./batchUpdateExpiredRatio";
import { calculateOptimalSweepParams } from "./calculate-optimal-sweep-params";
import { _sweepOnce } from "./sweep-once";
import { _updateWeightSweep } from "./updateWeight";

/**
 * Performs a sweep operation on the cache to remove expired and optionally stale entries.
 * Uses a linear scan with a saved pointer to resume from the last processed key.
 * @param state - The cache state.
 */
export const sweep = async (
  state: CacheState,

  /** @internal */
  utilities: SweepUtilities = {},
): Promise<void> => {
  const {
    schedule = defaultSchedule,
    yieldFn = defaultYieldFn,
    now = Date.now(),
    runOnlyOne = false,
  } = utilities;
  const startTime = now;

  let metrics = null;
  try {
    // Retrieve current system metrics from the monitor
    metrics = monitor.getMetrics();
  } catch {
    // Ignore errors in retrieving metrics
  }

  let sweepIntervalMs = OPTIMAL_SWEEP_INTERVAL;
  let sweepTimeBudgetMs = OPTIMAL_SWEEP_TIME_BUDGET_IF_NOTE_METRICS_AVAILABLE;
  if (metrics) {
    try {
      ({ sweepIntervalMs, sweepTimeBudgetMs } = calculateOptimalSweepParams({ metrics }));
    } catch {
      // Ignore errors in calculating optimal sweep params
    }
  }

  const totalSweepWeight = _updateWeightSweep();
  const currentExpiredRatios: number[][] = [];

  while (true) {
    if (totalSweepWeight <= 0) {
      break;
    }

    let threshold = Math.random() * totalSweepWeight;
    let instanceToSweep: CacheState = _instancesCache[0] as CacheState;

    // Select instance to sweep based on weight
    for (const inst of _instancesCache) {
      threshold -= inst._sweepWeight;
      if (threshold <= 0) {
        instanceToSweep = inst;
        break;
      }
    }

    const { ratio } = _sweepOnce(instanceToSweep, MAX_KEYS_PER_BATCH);
    // Initialize or update `currentExpiredRatios` array for current ratios
    (currentExpiredRatios[instanceToSweep._instanceIndexState] ??= []).push(ratio);

    if (Date.now() - startTime > sweepTimeBudgetMs) {
      break;
    }

    await yieldFn();
  }

  _batchUpdateExpiredRatio(currentExpiredRatios);

  // Schedule next sweep
  if (!runOnlyOne) {
    schedule(() => void sweep(state, utilities), sweepIntervalMs);
  }
};

// Default utilities for scheduling and yielding --------------------------------
const defaultSchedule: scheduleType = (fn, ms) => {
  const t = setTimeout(fn, ms);
  if (typeof t.unref === "function") t.unref();
};
export const defaultYieldFn: yieldFnType = () => new Promise(resolve => setImmediate(resolve));

// Types for internal utilities -----------------------------------------------
type scheduleType = (fn: () => void, ms: number) => void;
type yieldFnType = () => Promise<void>;
interface SweepUtilities {
  /**
   *  Default scheduling function using setTimeout.
   *  This can be overridden for testing.
   *  @internal
   */
  schedule?: scheduleType;

  /**
   *  Default yielding function using setImmediate.
   *  This can be overridden for testing.
   *  @internal
   */
  yieldFn?: yieldFnType;

  /** Current timestamp for testing purposes. */
  now?: number;

  /**
   * If true, only run one sweep cycle.
   * @internal
   */
  runOnlyOne?: boolean;
}
