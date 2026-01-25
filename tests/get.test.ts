import { describe, it, expect, beforeEach } from "vitest";

import { createCache, _resetInstanceCount } from "../src/cache/create-cache";
import { get } from "../src/cache/get";
import { setOrUpdate } from "../src/cache/set";

describe("get", () => {
  beforeEach(() => {
    _resetInstanceCount();
  });

  const now = Date.now();

  it("should return undefined for non-existent key", () => {
    const state = createCache();

    expect(get(state, "nonexistent")).toBe(undefined);
  });

  it("should return value for valid entry", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 });
    expect(get(state, "key1")).toBe("value1");
  });

  it("should return value for stale entry", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttl: 100, staleTtl: 200 }, now);
    expect(get(state, "key1", now + 150)).toBe("value1");
  });

  it("should purge stale entry if purgeStaleOnGet is set to true", () => {
    const state = createCache({ purgeStaleOnGet: true });

    setOrUpdate(state, { key: "key1", value: "value1", ttl: 100, staleTtl: 200 }, now);
    const firstGet = get(state, "key1", now + 150);
    expect(firstGet).toBe("value1");

    const secondGet = get(state, "key1", now + 160);
    expect(secondGet).toBe(undefined);
  });

  it("should return undefined for expired entry", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttl: 100 }, now);
    expect(get(state, "key1", now + 200)).toBe(undefined);
  });
});
