import { OPTIMAL_SWEEP_INTERVAL, WORST_SWEEP_INTERVAL, WORST_SWEEP_TIME_BUDGET } from "../defaults";
import { interpolate } from "../utils/interpolate";
import type { PerformanceMetrics } from "../utils/process-monitor";
import { monitor } from "../utils/start-monitor";

/**
 * Weights for calculating the weighted utilization ratio.
 * Each weight determines how strongly each metric influences the final ratio.
 */
export interface UtilizationWeights {
  /** Weight applied to memory utilization (non-inverted). Default: 1 */
  memory?: number;

  /** Weight applied to CPU utilization (inverted). Default: 1 */
  cpu?: number;

  /** Weight applied to event loop utilization (inverted). Default: 1 */
  loop?: number;
}

/**
 * Represents the calculated optimal sweep parameters based on system metrics.
 */
export interface OptimalSweepParams {
  /** The optimal interval in milliseconds between sweep operations. */
  sweepIntervalMs: number;

  /** The optimal maximum time budget in milliseconds for a sweep cycle. */
  sweepTimeBudgetMs: number;
}

/**
 * Options for customizing the sweep parameter calculation.
 */
interface CalculateOptimalSweepParamsOptions {
  /** System performance metrics to base the calculations on. */
  metrics?: PerformanceMetrics;

  /** Optional custom weights for each utilization metric. */
  weights?: UtilizationWeights;

  /** Interval (ms) used when system load is minimal. */
  optimalSweepIntervalMs?: number;

  /** Interval (ms) used when system load is maximal. */
  worstSweepIntervalMs?: number;

  /** Maximum sweep time budget (ms) under worst-case load. */
  worstSweepTimeBudgetMs?: number;
}

/**
 * Calculates adaptive sweep parameters based on real-time system utilization.
 *
 * Memory utilization is used as-is: higher memory usage → more conservative sweeps.
 * CPU and event loop utilization are inverted: lower usage → more conservative sweeps.
 *
 * This inversion ensures:
 * - When CPU and loop are *free*, sweeping becomes more aggressive (worst-case behavior).
 * - When CPU and loop are *busy*, sweeping becomes more conservative (optimal behavior).
 *
 * The final ratio is a weighted average of the three metrics, clamped to [0, 1].
 * This ratio is then used to interpolate between optimal and worst-case sweep settings.
 *
 * @param options - Optional configuration for weights and sweep bounds.
 * @returns Interpolated sweep interval, time budget, and the ratio used.
 */
export const calculateOptimalSweepParams = (
  options?: CalculateOptimalSweepParamsOptions,
): OptimalSweepParams => {
  const {
    metrics = monitor.getMetrics(),
    weights = {},
    optimalSweepIntervalMs = OPTIMAL_SWEEP_INTERVAL,
    worstSweepIntervalMs = WORST_SWEEP_INTERVAL,
    worstSweepTimeBudgetMs = WORST_SWEEP_TIME_BUDGET,
  } = options ?? {};

  // Resolve metric weights (default = 1)
  const memoryWeight = weights.memory ?? 1;
  const cpuWeight = weights.cpu ?? 1;
  const loopWeight = weights.loop ?? 1;

  // Memory utilization is used directly (0–1)
  const memoryUtilization = metrics?.memory.utilization ?? 0;

  // Raw CPU and loop utilization (0–1)
  const cpuUtilizationRaw = metrics?.cpu.utilization ?? 0;
  const loopUtilizationRaw = metrics?.loop.utilization ?? 0;

  // Invert CPU and loop utilization:
  // - Low CPU/loop usage → high inverted value → pushes toward worst-case behavior
  // - High CPU/loop usage → low inverted value → pushes toward optimal behavior
  const cpuUtilization = 1 - cpuUtilizationRaw;
  const loopUtilization = 1 - loopUtilizationRaw;

  // Weighted average of all metrics
  const weightedSum =
    memoryUtilization * memoryWeight + cpuUtilization * cpuWeight + loopUtilization * loopWeight;

  const totalWeight = memoryWeight + cpuWeight + loopWeight;

  // Final utilization ratio clamped to [0, 1]
  const ratio = Math.min(1, Math.max(0, weightedSum / totalWeight));

  // Interpolate sweep interval based on the ratio
  const sweepIntervalMs = interpolate({
    value: ratio,
    fromStart: 0,
    fromEnd: 1,
    toStart: optimalSweepIntervalMs,
    toEnd: worstSweepIntervalMs,
  });

  // Interpolate sweep time budget based on the ratio
  const sweepTimeBudgetMs = interpolate({
    value: ratio,
    fromStart: 0,
    fromEnd: 1,
    toStart: 0,
    toEnd: worstSweepTimeBudgetMs,
  });

  return {
    sweepIntervalMs,
    sweepTimeBudgetMs,
  };
};
