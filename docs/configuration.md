# Configuration

## Creating a Cache with Options

```javascript
// this are the default options
const cache = new LocalTtlCache({
  ...options,
});
```

## Configuration Options

### `defaultTtl` (number)

The default Time-To-Live in milliseconds for cache entries without an explicit TTL.

- **Type**: `number`
- **Default**: `180_000` (30 minutes)
- **Example**: `defaultTtl: 30 * 60 * 1000` (30 minutes)

```javascript
const cache = new LocalTtlCache({
  defaultTtl: 30 * 60 * 1000, // All entries live for 30 minutes by default
});

cache.set("key", "value"); // Uses default TTL of 30 minutes
cache.set("shortKey", "value", { ttl: 2 * 60 * 1000 }); // Override with 2 minutes
```

### `defaultStaleWindow` (number)

How long after expiration to continue serving stale data. This is useful when you want to serve slightly outdated data while fetching fresh data in the background.

- **Type**: `number`
- **Default**: `0` (no stale window)
- **Example**: `defaultStaleWindow: 1 * 60 * 1000` (1 minute)

```javascript
const cache = new LocalTtlCache({
  defaultTtl: 5 * 60 * 1000,
  defaultStaleWindow: 1 * 60 * 1000, // Serve stale for 1 extra minute
});

cache.set("data", { value: "old" });
// After 5 minutes: data is expired but still served as stale
// After 6 minutes: data is completely gone
```

### `maxSize` (number)

The maximum number of entries the cache can hold. When the limit is reached, the cache automatically cleans up expired entries and removes less-used items.

- **Type**: `number`
- **Default**: `Infinite` (no limit)
- **Example**: `maxSize: 10_000`

```javascript
const cache = new LocalTtlCache({
  maxSize: 10_000, // Only keep up to 10,000 items
});

// When you exceed 10_000 items new entries are ignored
```

### `purgeStaleOnGet` (boolean)

Whether to delete stale entries immediately after retrieving them.

- **Type**: `boolean`
- **Default**: `false`
- **Example**: `purgeStaleOnGet: true`

```javascript
const cache = new LocalTtlCache({
  defaultTtl: 5 * 60 * 1000,
  defaultStaleWindow: 2 * 60 * 1000,
  purgeStaleOnGet: true, // Delete stale entries as soon as you read them
});

cache.set("data", "value");
// After 5 minutes: data is stale
// When you call cache.get("data"), it returns the stale value AND deletes it
// Subsequent calls return undefined
```

### `purgeStaleOnSweep` (boolean)

Whether to delete stale entries during automatic cleanup (sweep) operations.

- **Type**: `boolean`
- **Default**: `false`
- **Example**: `purgeStaleOnSweep: true`

```javascript
const cache = new LocalTtlCache({
  defaultTtl: 5 * 60 * 1000,
  defaultStaleWindow: 2 * 60 * 1000,
  purgeStaleOnSweep: true, // Delete stale entries during background cleanup
});

// During automatic cleanup, stale entries are removed
// This helps keep memory usage lower
```

### Callbacks

Neezco Cache supports callbacks for monitoring cache operations:

#### `onExpire(key, value)`

Called when an entry expires naturally (reaches its TTL).

```javascript
const cache = new LocalTtlCache({
  onExpire: (key, value, reason) => {
    // reason can be: 'expired', or 'stale'
    console.log(`Entry expired: ${key} (${reason})`, value);
  },
});

cache.set("temp", { data: "temporary" }, { ttl: 5000 });
// After 5 seconds: "Entry expired: temp" is logged
```

#### `onDelete(key, value, reason)`

Called when an entry is deleted for any reason (manual deletion, expiration, or stale removal).

```javascript
const cache = new LocalTtlCache({
  onDelete: (key, value, reason) => {
    // reason can be: 'manual', 'expired', or 'stale'
    console.log(`Entry deleted: ${key} (${reason})`, value);
  },
});

cache.set("data", "value", { ttl: 5000 });
cache.delete("data"); // Logs: "Entry deleted: data (manual)"
// After 5 seconds: Logs: "Entry deleted: data (expired)"
```

## Setting Options Per Entry

You can override defaults on a per-entry basis:

```javascript
const cache = new LocalTtlCache({
  defaultTtl: 3 * 60 * 1000,
  defaultStaleWindow: 30 * 1000,
});

cache.set("entry1", "value1");

// Override TTL
cache.set("entry2", "value2", { ttl: 30_000 }); // 30 seconds

// Override staleWindow
cache.set("entry3", "value3", { staleWindow: 5 * 60 * 1000 }); // 5 minute stale window

// Override everything
cache.set("entry4", "value4", {
  ttl: 60_000,
  staleWindow: 10_000,
  tags: ["important"],
});
```

---

## Navigation

- **[Getting Started](./getting-started.md)** - Back to basics
- **[Examples](./examples.md)** - Real-world use cases
- **[← API Reference](./api-reference.md)** - Complete method documentation
