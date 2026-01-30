/**
 * Maximum number of keys to process in a single sweep batch.
 */
export const MAX_KEYS_PER_BATCH = 1000;

/**
 * Minimal expired ratio enforced.
 * Ensures control sweeps run to update weights at lease
 * on high memory pressure.
 */
export const MINIMAL_EXPIRED_RATIO = 0.05;

/**
 * Memory usage reference (80%) above which
 * control sweeps are forced, interpolating down toward
 * MINIMAL_EXPIRED_RATIO.
 */
export const EXPIRED_RATIO_MEMORY_THRESHOLD = 0.8;

/**
 * Default maximum expired ratio allowed when memory is free.
 * Acts as the upper bound in interpolation with MINIMAL_EXPIRED_RATIO
 * Recommended range: 0.3–0.5.
 */
export const DEFAULT_MAX_EXPIRED_RATIO = 0.4;

/**
 * Optimal interval in milliseconds between sweeps when metrics are available.
 */
export const OPTIMAL_SWEEP_INTERVAL = 2000;

/**
 * Worst-case interval in milliseconds between sweeps.
 */
export const WORST_SWEEP_INTERVAL = 300;

/**
 * Optimal time budget in milliseconds for each sweep when metrics are not available.
 */
export const WORST_SWEEP_TIME_BUDGET = 50;

/**
 * Optimal time budget in milliseconds for each sweep when metrics are not available.
 */
export const OPTIMAL_SWEEP_TIME_BUDGET_IF_NOTE_METRICS_AVAILABLE = 20;

/**
 * Maximum allowed memory usage for the process in megabytes (MB).
 * NOTE: This is used as a default and can be overridden by environment detection.
 * @default 1024 (1 GB)
 */
export const DEFAULT_MAX_PROCESS_MEMORY_MB = 1024; //

/**
 * Base weight for memory pressure.
 */
export const DEFAULT_MEMORY_WEIGHT = 10;

/**
 * Weight for raw CPU utilization.
 * CPU + loop = 1.5 × memory = 15
 */
export const DEFAULT_CPU_WEIGHT = 8.5;

/**
 * Weight for event-loop utilization.
 * Complements CPU to reach total CPU weight.
 */
export const DEFAULT_LOOP_WEIGHT = 6.5;
