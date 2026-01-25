import { performance, type EventLoopUtilization } from "perf_hooks";

/**
 * Creates a performance monitor that periodically samples memory usage,
 * CPU usage, and event loop utilization for the current Node.js process.
 *
 * The monitor runs on a configurable interval and optionally invokes a
 * callback with the collected metrics on each cycle. It also exposes
 * methods to start and stop monitoring, retrieve the latest metrics,
 * and update configuration dynamically.
 *
 * @param options Configuration options for the monitor, including sampling
 * interval, maximum thresholds for normalization, and an optional callback.
 * @returns An API object that allows controlling the monitor lifecycle.
 */
export function createMonitorObserver(
  options?: Partial<CreateMonitorObserverOptions>,
): ReturnCreateMonitor {
  let intervalId: NodeJS.Timeout | null = null;

  let lastMetrics: PerformanceMetrics | null = null;

  let prevHrtime = process.hrtime.bigint();

  let prevMem = process.memoryUsage();
  let prevCpu = process.cpuUsage();
  let prevLoop = performance.eventLoopUtilization();
  let lastCollectedAt = Date.now();

  const config = {
    interval: options?.interval ?? 500,
    // options.maxMemory is expected in MB; store bytes internally
    maxMemory: (options?.maxMemory ?? 512) * 1024 * 1024,
  };

  function start(): void {
    if (intervalId) return; // already running

    intervalId = setInterval(() => {
      try {
        const now = Date.now();

        const metrics = collectMetrics({
          prevCpu,
          prevHrtime,
          prevMem,
          prevLoop,
          maxMemory: config.maxMemory,
          collectedAtMs: now,
          previousCollectedAtMs: lastCollectedAt,
          interval: config.interval,
        });

        lastMetrics = metrics;
        options?.callback?.(metrics);

        prevCpu = metrics.cpu.total;
        prevLoop = metrics.loop.total;
        prevMem = metrics.memory.total;

        prevHrtime = process.hrtime.bigint();
        lastCollectedAt = now;
      } catch (e: unknown) {
        stop();
        throw new Error("MonitorObserver: Not available", { cause: e });
      }
    }, config.interval);

    if (typeof intervalId.unref === "function") {
      intervalId.unref();
    }
  }

  function stop(): void {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function getMetrics(): PerformanceMetrics | null {
    if (lastMetrics) {
      return lastMetrics;
    }
    return null;
  }

  function updateConfig(newConfig: Partial<CreateMonitorObserverOptions>): void {
    if (newConfig.maxMemory !== undefined) {
      // convert MB -> bytes
      config.maxMemory = newConfig.maxMemory * 1024 * 1024;
    }

    if (newConfig.interval !== undefined) {
      config.interval = newConfig.interval;

      // restart if active to apply new interval
      if (intervalId) {
        stop();
        start();
      }
    }
  }

  return {
    start,
    stop,
    getMetrics,
    updateConfig,
  };
}

/**
 * Collects and normalizes performance metrics for the current process,
 * including memory usage, CPU usage, and event loop utilization.
 *
 * CPU and event loop metrics are computed as deltas relative to previously
 * recorded values. All metrics are normalized into a utilization between 0 and 1
 * based on the configured maximum thresholds.
 *
 * @param props Previous metric snapshots and normalization limits.
 * @returns A structured object containing normalized performance metrics.
 */
export function collectMetrics(props: {
  prevMem: NodeJS.MemoryUsage;
  prevCpu: NodeJS.CpuUsage;
  prevHrtime: bigint;
  prevLoop: EventLoopUtilization;
  maxMemory: number; // bytes
  collectedAtMs: number;
  previousCollectedAtMs: number;
  interval: number;
}): PerformanceMetrics {
  const nowHrtime = process.hrtime.bigint();

  const elapsedNs = Number(nowHrtime - props.prevHrtime);
  const elapsedMs = elapsedNs / 1e6;
  const actualElapsed = props.collectedAtMs - props.previousCollectedAtMs;

  const mem = process.memoryUsage();
  const deltaMem: NodeJS.MemoryUsage = {
    rss: mem.rss - props.prevMem.rss,
    heapTotal: mem.heapTotal - props.prevMem.heapTotal,
    heapUsed: mem.heapUsed - props.prevMem.heapUsed,
    external: mem.external - props.prevMem.external,
    arrayBuffers: mem.arrayBuffers - props.prevMem.arrayBuffers,
  };
  const memRatio = Math.min(1, mem.rss / props.maxMemory);

  const cpuDelta = process.cpuUsage(props.prevCpu);
  const cpuMs = (cpuDelta.system + cpuDelta.user) / 1e3;
  const cpuRatio = cpuMs / elapsedMs;

  const loop = performance.eventLoopUtilization(props.prevLoop);

  return {
    cpu: {
      // deltaMs: cpuMs, // remove to avoid confusion with different unit type
      utilization: cpuRatio,
      delta: cpuDelta,
      total: process.cpuUsage(),
    },

    loop: {
      utilization: loop.utilization,
      delta: loop,
      total: performance.eventLoopUtilization(),
    },

    memory: {
      utilization: memRatio,
      delta: deltaMem,
      total: mem,
    },

    collectedAt: props.collectedAtMs,
    previousCollectedAt: props.previousCollectedAtMs,
    interval: props.interval,
    actualElapsed,
  };
}

// -----------------------------------------------------------------

/**
 * Represents a metric extended with a normalized utilization between 0 and 1.
 *
 * The utilization indicates how close the metric is to its configured maximum
 * threshold, where 0 means minimal usage and 1 means the limit has been reached.
 *
 * @typeParam T The underlying metric type being normalized.
 */
export type NormalizedMetric<T> = T & {
  /** Normalized value between 0 and 1 */
  utilization: number;
};

/**
 * PerformanceMetrics describes the actual shape returned by collectMetrics.
 * All metric groups include raw `delta` and `total` objects plus a normalized utilization.
 */
export interface PerformanceMetrics {
  memory: NormalizedMetric<{
    delta: NodeJS.MemoryUsage;
    total: NodeJS.MemoryUsage;
  }>;

  cpu: NormalizedMetric<{
    delta: NodeJS.CpuUsage;
    total: NodeJS.CpuUsage;
  }>;

  loop: NormalizedMetric<{
    delta: EventLoopUtilization;
    total: EventLoopUtilization;
  }>;

  /** Timestamp in milliseconds when this metric was collected */
  collectedAt: number;

  /** Timestamp in milliseconds of the previous metric collection */
  previousCollectedAt: number;

  /** Interval in milliseconds at which the monitor is running */
  interval: number;

  /** Actual elapsed time in milliseconds since the last collection */
  actualElapsed: number;
}

/**
 * Options for createMonitorObserver.
 */
export interface CreateMonitorObserverOptions {
  /** Interval between samples in ms. Default: 500 */
  interval?: number;

  /** Maximum RSS memory in megabytes (MB) used for normalization. */
  maxMemory?: number;

  /** Optional callback invoked on each metrics sample. */
  callback?: (metrics: PerformanceMetrics) => void;
}

/**
 * Public API returned by `createMonitorObserver`.
 *
 * Provides methods to start and stop monitoring, retrieve the latest metrics,
 * and update the monitor configuration at runtime.
 */
export interface ReturnCreateMonitor {
  /** Stops the monitoring interval */
  stop: () => void;

  /** Starts the monitoring interval */
  start: () => void;

  /** Returns the last collected metrics or null if none have been collected yet */
  getMetrics: () => PerformanceMetrics | null;

  /** Allows updating the monitor configuration on the fly */
  updateConfig: (newConfig: Partial<CreateMonitorObserverOptions>) => void;
}
