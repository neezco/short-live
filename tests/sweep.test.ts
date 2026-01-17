import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createCache, resetInstanceCount } from "../src/cache/create-cache";
import { setOrUpdate } from "../src/cache/set";
import { defaultYieldFn, sweep } from "../src/sweep/sweep";

describe("sweep", () => {
  beforeEach(() => {
    resetInstanceCount();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should remove expired entries", async () => {
    const state = createCache({ autoStartSweep: false });
    const now = Date.now();
    vi.setSystemTime(now);

    // Set an expired entry
    setOrUpdate(state, { key: "expired", value: "val", ttl: 100 });
    // Set a fresh entry
    setOrUpdate(state, { key: "fresh", value: "val", ttl: 1000 });

    // Advance time past expiration
    vi.setSystemTime(now + 200);

    await sweep(state);

    expect(state.store.has("expired")).toBe(false);
    expect(state.store.has("fresh")).toBe(true);
  });

  it("should remove stale entries if purgeStaleOnSweep is true", async () => {
    const state = createCache({
      purgeStaleOnSweep: true,
      autoStartSweep: false,
    });
    const now = Date.now();
    vi.setSystemTime(now);

    // Set an entry with stale TTL
    setOrUpdate(state, { key: "stale", value: "val", ttl: 100, staleTtl: 500 });
    // Set a fresh entry
    setOrUpdate(state, { key: "fresh", value: "val", ttl: 1000 });

    // Advance time past stale period
    vi.setSystemTime(now + 250);

    await sweep(state);

    expect(state.store.has("stale")).toBe(false);
    expect(state.store.has("fresh")).toBe(true);
  });

  it("should not remove stale entries if purgeStaleOnSweep is false", async () => {
    const state = createCache({
      purgeStaleOnSweep: false,
      autoStartSweep: false,
    });
    const now = Date.now();
    vi.setSystemTime(now);

    // Set an entry with stale TTL
    setOrUpdate(state, { key: "stale", value: "val", ttl: 100, staleTtl: 200 });
    // Set a fresh entry
    setOrUpdate(state, { key: "fresh", value: "val", ttl: 1000 });

    // Advance time to stale period
    vi.setSystemTime(now + 150);

    await sweep(state);

    expect(state.store.has("stale")).toBe(true);
    expect(state.store.has("fresh")).toBe(true);
  });

  it("should break sweep when time budget is exceeded", async () => {
    const state = createCache({
      worstSweepTimeBudgetMs: -1,
      // optimalSweepTimeBudgetMs: -1,
      autoStartSweep: false,
    });
    const now = Date.now();
    vi.setSystemTime(now);

    setOrUpdate(state, { key: "expired1", value: "val", ttl: 100 });
    setOrUpdate(state, { key: "expired2", value: "val", ttl: 100 });
    setOrUpdate(state, { key: "fresh", value: "val", ttl: 1000 });

    vi.setSystemTime(now + 200);

    await sweep(state);

    expect(state.store.has("expired1")).toBe(false);
    expect(state.store.has("expired2")).toBe(true);
    expect(state.store.has("fresh")).toBe(true);
  });

  it("defaultYieldFn should call setImmediate", async () => {
    const spy = vi.spyOn(global, "setImmediate").mockImplementation(cb => {
      cb(); // ejecuta inmediatamente
      return {} as NodeJS.Immediate;
    });

    await defaultYieldFn();

    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it("should yield when keysPerBatch is reached", async () => {
    const now = Date.now();
    const yieldFn = vi.fn(async () => {});

    const state = createCache({
      keysPerBatch: 1,
      autoStartSweep: false,
    });

    vi.setSystemTime(now);

    setOrUpdate(state, { key: "expired1", value: "val", ttl: 100 });
    setOrUpdate(state, { key: "expired2", value: "val", ttl: 100 });
    setOrUpdate(state, { key: "expired3", value: "val", ttl: 100 });
    setOrUpdate(state, { key: "expired4", value: "val", ttl: 100 });

    vi.setSystemTime(now + 200);

    await sweep(state, { yieldFn });

    expect(yieldFn).toHaveBeenCalledTimes(4);
  });

  it("should schedule the next sweep multiple times", async () => {
    const callbacks: Array<() => void> = [];

    const sweepIntervalMs = Math.random() * 1000;

    const schedule = vi.fn((fn, ms) => {
      expect(ms).toBe(sweepIntervalMs);
      callbacks.push(fn as () => void);
    });

    const state = createCache({
      worstSweepIntervalMs: sweepIntervalMs,
      optimalSweepIntervalMs: sweepIntervalMs,
      autoStartSweep: false,
    });

    await sweep(state, { schedule });

    expect(schedule).toHaveBeenCalledTimes(1);

    callbacks[0]?.();
    expect(schedule).toHaveBeenCalledTimes(2);

    callbacks[1]?.();
    expect(schedule).toHaveBeenCalledTimes(3);

    callbacks[2]?.();
    expect(schedule).toHaveBeenCalledTimes(4);
  });

  it("should not start sweep automatically if autoStartSweep is false", () => {
    const schedule = vi.fn();
    const state = createCache({
      autoStartSweep: false,
    });

    // Since autoStartSweep is false, sweep should not be called automatically
    expect(schedule).not.toHaveBeenCalled();

    // Manually call sweep to verify it works
    void sweep(state, { schedule });
    expect(schedule).toHaveBeenCalledTimes(1);
  });
});
