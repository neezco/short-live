# Stale Windows

Understand how to use stale windows to control memory usage and improve performance gracefully.

---

## What is a Stale Window?

A stale window is a period after an entry expires where it can still be served. Instead of immediately removing expired data, Short-Live allows you to keep serving it while managing memory:

```javascript
const cache = new LocalTtlCache({
  defaultTtl: 5 * 60 * 1000, // Fresh for 5 minutes
  defaultStaleWindow: 2 * 60 * 1000, // Serve stale for 2 more minutes
});

cache.set("data", "current value");

// Minutes 0-5: data is fresh
console.log(cache.get("data")); // "current value"

// Minutes 5-7: data is expired but still served (stale)
console.log(cache.get("data")); // "current value" (as stale)

// After 7 minutes: data is completely gone
console.log(cache.get("data")); // undefined
```

---

## Stale Windows as Memory Control

The real power of stale windows is **controlling how memory is freed** in response to application needs.

After an entry expires, it can still be served as stale data. What happens next depends on your configuration: you can delete it immediately, delete it during background cleanup, or keep it around until memory is needed.

---

## Memory Control: Purging Stale Entries

By default, stale entries remain in cache until explicitly deleted or storage is needed. Two options control what happens:

**`purgeStaleOnGet: true`** — Delete stale entries immediately when accessed.

**`purgeStaleOnSweep: true`** — Delete stale entries during background cleanup operations.

Both are optional and default to `false`, meaning stale data persists until you need the memory.

---

## Summary

Stale windows give your application flexibility to match its memory profile:

- **Need tight memory control?** Use `purgeStaleOnGet` to delete immediately
- **Normal resource availability?** Let stale data remain—it's useful
- **Configurable behavior** through `purgeStaleOnGet` and `purgeStaleOnSweep`

The key benefit: graceful degradation. Your app continues serving data even after expiration, keeping the user experience responsive while managing memory appropriately.

---

## Next

- **[Tag-Based Invalidation](./tag-based-invalidation.md)** - Control cache invalidation
- **[Back to Examples](../examples.md)**
