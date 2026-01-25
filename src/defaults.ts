/**
 * Maximum number of keys to process in a single sweep batch.
 */
export const MAX_KEYS_PER_BATCH = 1000;

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
