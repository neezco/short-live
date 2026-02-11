import {
  DEFAULT_PURGE_STALE_ON_GET_NO_LIMITS,
  DEFAULT_PURGE_STALE_ON_SWEEP_NO_LIMITS,
} from "../defaults";
import type { CacheState, PurgeMode } from "../types";

import { _metrics } from "./start-monitor";

/**
 * Computes memory utilization as a normalized 0–1 value.
 *
 * In backend environments where metrics are available, returns the actual
 * memory utilization from the monitor. In browser environments or when
 * metrics are unavailable, returns 0.
 *
 * @returns Memory utilization in range [0, 1]
 *
 * @internal
 */
const getMemoryUtilization = (): number => {
  if (__BROWSER__ || !_metrics) return 0;
  return _metrics.memory?.utilization ?? 0;
};

/**
 * Computes size utilization as a normalized 0–1 value.
 *
 * If maxSize is finite, returns `currentSize / maxSize`. Otherwise returns 0.
 *
 * @param state - The cache state
 * @returns Size utilization in range [0, 1]
 *
 * @internal
 */
const getSizeUtilization = (state: CacheState): number => {
  if (!Number.isFinite(state.maxSize) || state.maxSize <= 0 || state.size <= 0) return 0;
  return Math.min(1, state.size / state.maxSize);
};

/**
 * Computes a 0–1 resource usage metric based on the configured purge metric.
 *
 * - `"size"`: Returns size utilization only.
 * - `"memory"`: Returns memory utilization (backend only; returns 0 in browser).
 * - `"higher"`: Returns the maximum of memory and size utilization.
 *
 * The result is always clamped to [0, 1].
 *
 * @param state - The cache state
 * @returns Resource usage in range [0, 1]
 *
 * @internal
 */
export const computeResourceUsage = (state: CacheState): number | null => {
  const metric = state.purgeResourceMetric;
  if (!metric || metric === "fixed") return null;

  if (metric === "size") {
    return getSizeUtilization(state);
  }

  if (metric === "memory") {
    return getMemoryUtilization();
  }

  if (metric === "higher") {
    return Math.min(1, Math.max(getMemoryUtilization(), getSizeUtilization(state)));
  }

  return null;
};

/**
 * Determines whether stale entries should be purged based on the purge mode and current resource usage.
 *
 * @param mode - The purge mode setting
 *  - `false` → never purge
 *  - `true` → always purge
 *  - `number (0–1)` → purge when `resourceUsage >= threshold`
 * @param state - The cache state
 * @returns True if stale entries should be purged, false otherwise
 *
 * @internal
 */
export const shouldPurge = (
  mode: PurgeMode,
  state: CacheState,
  purgeContext: "get" | "sweep",
): boolean => {
  if (mode === false) return false;
  if (mode === true) return true;

  const userThreshold = Number(mode);
  const defaultPurge =
    purgeContext === "sweep"
      ? DEFAULT_PURGE_STALE_ON_SWEEP_NO_LIMITS
      : DEFAULT_PURGE_STALE_ON_GET_NO_LIMITS;

  if (Number.isNaN(userThreshold)) return defaultPurge;

  const usage = computeResourceUsage(state);
  if (!usage) {
    return defaultPurge;
  }
  return usage >= Math.max(0, Math.min(1, userThreshold));
};
