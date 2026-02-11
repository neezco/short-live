import {
  DEFAULT_PURGE_STALE_ON_GET_NO_LIMITS,
  DEFAULT_PURGE_STALE_ON_GET_THRESHOLD,
  DEFAULT_PURGE_STALE_ON_SWEEP_THRESHOLD,
} from "../defaults";
import type { PurgeMode } from "../types";

/**
 * Checks if a numeric value is a valid positive limit.
 * @internal
 */
const isValidLimit = (value: number): boolean => Number.isFinite(value) && value > 0;

/**
 * Checks if the required limits are configured for the given metric.
 * @internal
 */
const checkRequiredLimits = (
  metric: "size" | "memory" | "higher" | "fixed",
  hasSizeLimit: boolean,
  hasMemoryLimit: boolean,
): boolean => {
  if (metric === "fixed") return false;
  if (metric === "size") return hasSizeLimit;
  if (metric === "memory") return hasMemoryLimit;
  if (metric === "higher") return hasSizeLimit && hasMemoryLimit;
  return false;
};

/**
 * Gets the requirement text for a metric when limits are missing.
 * @internal
 */
const getLimitRequirementText = (metric: "size" | "memory" | "higher" | "fixed"): string => {
  if (metric === "fixed") return "Numeric thresholds are not supported (metric is 'fixed')";
  if (metric === "size") return "'maxSize' must be a valid positive number";
  if (metric === "memory") return "'maxMemorySize' must be a valid positive number";
  if (metric === "higher")
    return "both 'maxSize' and 'maxMemorySize' must be valid positive numbers";
  return "required configuration";
};

/**
 * Warns user if a numeric purge mode was provided but required limits are missing for the selected metric.
 * @internal
 */
const warnInvalidPurgeMode = (
  mode: PurgeMode,
  metric: "size" | "memory" | "higher" | "fixed",
  operation: "purgeStaleOnGet" | "purgeStaleOnSweep",
  fallback: PurgeMode,
): void => {
  const isNumericMode = typeof mode === "number" && mode > 0 && mode <= 1;
  if (!isNumericMode) return;

  const requiredText = getLimitRequirementText(metric);

  console.warn(
    `[Cache Warning] Configuration issue in '${operation}': You specified a threshold-based strategy (${mode}) with purgeResourceMetric '${metric}', but ${requiredText}.\n` +
      `  - Falling back to: ${fallback}`,
  );
};

/**
 * Generic purge mode resolver that handles both get and sweep operations.
 * @internal
 */
const resolvePurgeMode = (
  maxSize: number,
  maxMemorySize: number,
  metric: "size" | "memory" | "higher" | "fixed",
  thresholdFallback: number,
  booleanFallback: boolean,
  operation: "purgeStaleOnGet" | "purgeStaleOnSweep",
  userValue?: PurgeMode,
): PurgeMode => {
  const hasSizeLimit = isValidLimit(maxSize);
  const hasMemoryLimit = isValidLimit(maxMemorySize);
  const hasRequiredLimits = checkRequiredLimits(metric, hasSizeLimit, hasMemoryLimit);

  const fallback = hasRequiredLimits ? thresholdFallback : booleanFallback;

  if (userValue !== undefined) {
    warnInvalidPurgeMode(userValue, metric, operation, fallback);
    if (!hasRequiredLimits && typeof userValue === "number") return fallback;
    return userValue;
  }

  return fallback;
};

/**
 * Resolves the purge resource metric based on available limits and environment.
 *
 * - Browser: returns "size" if maxSize is valid, otherwise "fixed"
 * - Backend with both maxSize and maxMemorySize: returns "higher"
 * - Backend with only maxMemorySize: returns "memory"
 * - Backend with only maxSize: returns "size"
 * - Backend with no limits: returns "fixed"
 *
 * @param maxSize - Maximum cache size limit
 * @param maxMemorySize - Maximum memory size limit
 * @returns The appropriate purge resource metric for this configuration
 *
 * @internal
 */
export const resolvePurgeResourceMetric = (
  maxSize: number,
  maxMemorySize: number,
): "size" | "memory" | "higher" | "fixed" => {
  const hasSizeLimit = isValidLimit(maxSize);
  const hasMemoryLimit = isValidLimit(maxMemorySize);

  if (__BROWSER__) {
    return hasSizeLimit ? "size" : "fixed";
  }

  if (hasSizeLimit && hasMemoryLimit) return "higher";
  if (hasMemoryLimit) return "memory";
  if (hasSizeLimit) return "size";

  return "fixed";
};

/**
 * Resolves the default purgeStaleOnGet mode based on available limits and metric.
 *
 * - With limits matching the metric: returns threshold-based value (0.80)
 * - Without matching limits: returns false
 *
 * @param maxSize - Maximum cache size limit
 * @param maxMemorySize - Maximum memory size limit
 * @param metric - The purge resource metric being used
 * @param userValue - User-provided value (if any)
 * @returns The purgeStaleOnGet mode to use
 *
 * @internal
 */
export const resolvePurgeStaleOnGet = (
  maxSize: number,
  maxMemorySize: number,
  metric: "size" | "memory" | "higher" | "fixed",
  userValue?: PurgeMode,
): PurgeMode =>
  resolvePurgeMode(
    maxSize,
    maxMemorySize,
    metric,
    DEFAULT_PURGE_STALE_ON_GET_THRESHOLD,
    DEFAULT_PURGE_STALE_ON_GET_NO_LIMITS,
    "purgeStaleOnGet",
    userValue,
  );

/**
 * Resolves the default purgeStaleOnSweep mode based on available limits and metric.
 *
 * - With limits matching the metric: returns threshold-based value (0.5)
 * - Without matching limits: returns true
 *
 * @param maxSize - Maximum cache size limit
 * @param maxMemorySize - Maximum memory size limit
 * @param metric - The purge resource metric being used
 * @param userValue - User-provided value (if any)
 * @returns The purgeStaleOnSweep mode to use
 *
 * @internal
 */
export const resolvePurgeStaleOnSweep = (
  maxSize: number,
  maxMemorySize: number,
  metric: "size" | "memory" | "higher" | "fixed",
  userValue?: PurgeMode,
): PurgeMode =>
  resolvePurgeMode(
    maxSize,
    maxMemorySize,
    metric,
    DEFAULT_PURGE_STALE_ON_SWEEP_THRESHOLD,
    true,
    "purgeStaleOnSweep",
    userValue,
  );
