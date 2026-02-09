# Getting Started with Neezco Cache

## Installation

```bash
npm install @neezco/cache
# or
yarn add @neezco/cache
# or
pnpm add @neezco/cache
```

## Recommended Setup Pattern

For better TypeScript autocomplete, define a dedicated cache module:

```typescript
import LocalTtlCache from "@neezco/cache";

const cacheInstance = new LocalTtlCache({
  defaultTtl: 5 * 60 * 1000,
  maxSize: 1_000,
});

export const cache = cacheInstance;
```

## Domain‑oriented singleton caches

Instead of a single global cache, you can maintain **one singleton per domain** to avoid key collisions and keep responsibilities clear:

```typescript
import LocalTtlCache from "@neezco/cache";

// User‑related data
export const usersCache = new LocalTtlCache({
  defaultTtl: 5 * 60 * 1000,
  maxSize: 1_000,
});

// Asset metadata
export const assetsCache = new LocalTtlCache({
  defaultTtl: 10 * 60 * 1000,
  maxSize: 2_000,
});
```

## Minimal Usage Example

```typescript
import { cache } from "./path-to-your-cache-instance";
// or
// import { usersCache } from "./path-to-your-cache-instance";
// import { assetsCache } from "./path-to-your-cache-instance";

cache.set("user:123", "cached-data", {
  ttl: 5 * 60 * 1000, // fresh for 5 minutes
  staleWindow: 2 * 60 * 1000, // may be served stale for 2 more minutes
  tags: ["user", "user:123"], // tags for later invalidation
});

console.log("After set:", cache.get("user:123")); // fresh value

setTimeout(
  () => {
    console.log(
      "After TTL but within stale window:",
      cache.get("user:123"), // stale value
    );

    cache.invalidateTag("user:123");

    console.log(
      "After tag invalidation:",
      cache.get("user:123"), // undefined
    );
  },
  6 * 60 * 1000,
); // 6 minutes
```

## Next Steps

- **[Examples](./examples.md)** - Real-world use cases
- **[API Reference](./api-reference.md)** – Complete method documentation with edge cases
- **[Configuration](./configuration.md)** – All options explained in detail
