# API Reference

## LocalTtlCache Class

A TTL (Time-To-Live) cache with support for expiration, stale windows, tag-based invalidation, and automatic cleanup.

### Constructor

```javascript
const cache = new LocalTtlCache(options);
```

Creates a new cache instance.

**Parameters:**

- `options` (optional) - Configuration object. See [Configuration Guide](./configuration.md) for details, including:
  - `defaultTtl` - Default entry lifetime
  - `defaultStaleWindow` - Default stale serving window
  - `maxSize` - Maximum number of entries allowed
  - `maxMemorySize` - Maximum memory usage (MB) allowed
  - `purgeStaleOnGet` / `purgeStaleOnSweep` - Stale entry handling
  - `onExpire` / `onDelete` - Lifecycle callbacks

---

## Methods

### `set(key, value, options)`

Store a value in the cache.

```typescript
set(
  key: string,
  value: unknown,
  options?: {
    ttl?: number;
    staleWindow?: number;
    tags?: string | string[];
  }
): boolean
```

**Parameters:**

- `key` - A unique identifier for the cached value
- `value` - Any value to cache (objects, primitives, etc.)
- `options.ttl` - Time-To-Live in milliseconds. If not provided, uses `defaultTtl`
- `options.staleWindow` - How long to serve stale data after expiration (in milliseconds)
- `options.tags` - One or more tags for group invalidation

**Returns:** `true` if the entry was set or updated, `false` if rejected due to limits or invalid input

**Example:**

```javascript
const success = cache.set("user:123", "cached-value", {
  ttl: 5 * 60 * 1000, // Expires in 5 minutes
  staleWindow: 1 * 60 * 1000, // Serve stale for 1 more minute
  tags: ["user:123"], // Tag for invalidation
});

if (!success) {
  console.log("Entry rejected: cache at maxSize or maxMemorySize limit");
}
```

**Edge Cases:**

- Overwriting an existing key replaces it completely
- If `ttl` is 0 or Infinite, the entry never expires immediately
- If `ttl` is negative, it is ignored and treated as “no TTL”.
- If `staleWindow` is larger than `ttl`, the entry can be served as stale for longer than it was fresh
- Tags are optional; only necessary for group invalidation via `invalidateTag()`
- Setting a key to `null` is valid; calling `cache.set("user:123", null)` overwrites any previous value and stores `null` as the new value
- Returns `false` if value is `undefined` (existing value remains untouched if it exists)
- Returns `false` if new entry would exceed [`maxSize`](./configuration.md#maxsize-number) limit, but updating existing keys always succeeds
- Returns `false` if new entry would exceed [`maxMemorySize`](./configuration.md#maxmemorysize-number) limit, but updating existing keys always succeeds (not supported in browsers)

---

### `get(key, options)`

Retrieve a value from the cache.

```typescript
interface EntryMetadata<T = unknown> {
  // The cached value.
  data: T;

  // Absolute timestamp when this entry becomes fully expired (in milliseconds).
  expirationTime: number;

  // Absolute timestamp when the stale window expires (in milliseconds).
  staleWindowExpiration: number;

  // Current status of the entry (fresh, stale, or expired).
  status: ENTRY_STATUS;

  // Tags associated with this entry, or null if no tags are set.
  tags: string[] | null;
}

get<T = unknown>(
  key: string,
  options?: { includeMetadata?: boolean }
): T | undefined | EntryMetadata<T>
```

**Parameters:**

- `key` - The key to retrieve
- `options.includeMetadata` (optional, default: false) - If true, returns entry metadata (data, status, expirationTime, staleWindowExpiration, tags)

**Returns:** The cached value, or entry metadata object if `includeMetadata` is true. Returns `undefined` if not found or expired.

**Example:**

```js
const user = cache.get("user:123");

const entry = cache.get("user:123", { includeMetadata: true });
if (entry) {
  console.log(entry.data);
  console.log(entry.status);
  console.log(entry.expirationTime);
  console.log(entry.staleWindowExpiration);
  console.log(entry.tags);
}
```

**Edge Cases:**

- Returns `undefined` if the key doesn't exist
- Returns `undefined` if the key has expired
- Returns the stale value (instead of `undefined`) if the key is in the stale window
- If `purgeStaleOnGet` is enabled, stale entries are deleted after being returned
- Does NOT throw errors for invalid keys

---

### `has(key)`

Check if a key exists in the cache and is not expired.

```typescript
has(key: string): boolean
```

**Parameters:**

- `key` - The key to check

**Returns:** `true` if the key exists and is valid, `false` otherwise

**Example:**

```js
const user = cache.has("user:123");
// user = boolean
```

**Edge Cases:**

- Returns `false` if the key doesn't exist
- Returns `false` if the key has expired beyond the stale window
- Returns `true` if the key is in the stale window (still being served)
- Both `has()` and `get()` have O(1) complexity; prefer `get()` if you need the value
- Returns `true` even if the stored value is `null`; `null` is a valid value and `has(key)` still considers the entry present and valid

**Recommendation:**

```javascript
// Using `get()` when you need both existence check and the stored value.
// `get()` already tells you whether the key exists (value !== undefined)
// and gives you the value in a single O(1) lookup.

const user = cache.get("user:123");

if (user !== undefined) {
  // Key exists and you already have the value.
  handleUser(user);
} else {
  // Key does not exist.
  fetchUserFromDB();
}

// Using `has()` only when you do NOT need the stored value.
// This avoids retrieving data you won't use.

if (cache.has("feature:beta")) {
  // Only the presence of the key matters here.
  enableBetaFeature();
}
```

---

### `delete(key)`

Remove a specific key from the cache.

```typescript
delete(key: string): boolean
```

**Parameters:**

- `key` - The key to delete

**Returns:** `true` if the key was deleted, `false` if it didn't exist

**Example:**

```javascript
const wasDeleted = cache.delete("user:123");
console.log(wasDeleted); // true if key existed
```

**Edge Cases:**

- Triggers the `onDelete` callback with reason `'manual'`
- Does not trigger the `onExpire` callback
- Returns `false` if the key was already expired
- Deleting a non-existent key returns `false` without error

---

### `clear()`

Remove all entries from the cache at once.

```typescript
clear(): void
```

**Returns:** Nothing (void)

**Example:**

```javascript
cache.clear();
console.log(cache.size); // 0
```

**Edge Cases:**

- The `onDelete` callback is NOT invoked during clear (intentional optimization)
- Clears both expired and fresh entries
- Resets `cache.size` to 0
- Does not affect cache configuration

---

### `invalidateTag(tags, options)`

Mark all entries with one or more tags as expired (or stale, if requested).

```typescript
invalidateTag(
  tags: string | string[],
  options?: InvalidateTagOptions
): void
```

Options type: `InvalidateTagOptions` — an extensible object with `asStale?: boolean`.

**Parameters:**

- `tags` - A single tag (string) or array of tags to invalidate
- `options.asStale` (optional) - If `true`, marks entries as stale instead of fully expired. Stale entries can still be served if within the stale window

**Returns:** Nothing (void)

**Example:**

```javascript
// Invalidate a single tag
cache.invalidateTag("user:123");

// Invalidate multiple tags
cache.invalidateTag(["user:123", "posts:456"]);

// Mark as stale instead of expired (still served from stale window)
cache.invalidateTag("user:123", { asStale: true });
```

**Edge Cases:**

- If an entry has multiple tags, invalidating ANY of those tags invalidates the entry
- Does not throw errors if a tag has no associated entries
- Invalidating a tag doesn't prevent new entries from being tagged with it later

---

### `size` (getter property)

Get the current number of entries in the cache.

```typescript
get size(): number
```

**Returns:** The number of entries currently stored, including entries that may already be expired but have not yet been removed by the lazy cleanup process.

**Example:**

```javascript
console.log(cache.size); // 42
if (cache.size > 1000) {
  console.log("Cache is getting large");
}
```

**Edge Cases:**

- Includes both fresh and stale entries in the count
- Expired entries not yet cleaned up by the background sweep are included (lazy deletion for efficiency)
- Updating an existing key does not increase the size
- Deleting a key decreases the size by 1
- Calling `clear()` resets the size to 0

---

## Navigation

- **[Getting Started](./getting-started.md)** - Back to basics
- **[Examples](./examples.md)** - Real-world use cases
- **[Configuration](./configuration.md)** - All options explained
