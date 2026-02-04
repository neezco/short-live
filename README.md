## 🚧 Project Status

> **⚠️ Under active development**  
> This library has not yet reached its first stable release.  
> The API is still evolving, and **breaking changes** may occur at any time.  
> Production use is **not recommended** until a stable version is published.

# Short-Live 🚀

**A smart, lightweight caching library that helps you store data temporarily with automatic cleanup.**

## Why Short-Live?

Caching is powerful, but managing cached data can be tricky. You need to:

- **Prevent stale data** from being used when it's too old
- **Clean up automatically** so your memory doesn't fill up
- **Invalidate related data** when something changes

Short-Live does all of this for you—automatically and intelligently. Store data once, let it handle the rest.

---

## What Can You Do With It?

### ✅ Store data with an expiration date

Data automatically becomes unusable after a certain time. No manual cleanup needed.

```javascript
const cache = new LocalTtlCache();

// Store a user for 5 minutes
cache.set(
  "user:123",
  { name: "Alice", email: "alice@example.com" },
  {
    ttl: 5 * 60 * 1000,
  },
);

// After 5 minutes, it's gone
console.log(cache.get("user:123")); // undefined
```

### ✅ Keep serving data gracefully after expiration

Sometimes you want to keep serving old data a bit longer while you fetch fresh data in the background. Short-Live calls this a "stale window."

```javascript
const cache = new LocalTtlCache();

// Fresh for 5 minutes, but we'll still serve it for 2 more minutes even if it's expired
cache.set(
  "weather",
  { temp: 72, city: "NYC" },
  {
    ttl: 5 * 60 * 1000,
    staleWindow: 2 * 60 * 1000, // Keep serving for 2 extra minutes while fetching fresh data
  },
);
```

This is perfect for APIs or data that doesn't need to be perfectly fresh—you can still serve something while updating in the background.

### ✅ Group data with tags and invalidate it all at once

When something changes, you can instantly invalidate all related data without having to delete items one by one.

```javascript
const cache = new LocalTtlCache();

// Store user data with a 'user:456' tag
cache.set("name", "Bob", { tags: "user:456" });
cache.set("email", "bob@example.com", { tags: "user:456" });
cache.set("preferences", { theme: "dark" }, { tags: "user:456" });

// User updates their profile - invalidate everything at once
cache.invalidateTag("user:456");

// All three are now expired
console.log(cache.get("name")); // undefined
console.log(cache.get("email")); // undefined
console.log(cache.get("preferences")); // undefined
```

---

## Key Features

### 🧹 Automatic Cleanup

Short-Live cleans up expired data automatically in the background. You don't have to do anything—it happens while your app runs.

### 📊 Works at Any Scale

Whether you're caching 10 items or millions, Short-Live is designed to be efficient and won't slow you down.

### 🎯 Smart Memory Management

The library doesn't just delete randomly. It intelligently prioritizes what to clean up based on memory usage and patterns.

### 🏷️ Simple Tag-Based Invalidation

Group related data and clear it all with a single command. Perfect for when a user updates their profile or data changes.

### ⚙️ Configurable Defaults

Set defaults once, and all your cache entries inherit them. Less configuration per item.

---

## Getting Started

<!-- ### Installation

```bash
npm install short-live
# or
yarn add short-live
# or
pnpm add short-live
``` -->

### Basic Usage

```javascript
import { LocalTtlCache } from "short-live";

// Create a cache
const cache = new LocalTtlCache();

// Store something for 10 seconds
cache.set("myKey", "myValue", { ttl: 10_000 });

// Get it back (while it's fresh)
console.log(cache.get("myKey")); // 'myValue'

// After 10 seconds, it's gone
setTimeout(() => {
  console.log(cache.get("myKey")); // undefined
}, 10_000);

// Delete manually if needed
cache.delete("myKey");
```

---

## Real-World Examples

### API Response Caching

Cache API responses so you don't hammer your backend with repeated requests:

```javascript
const cache = new LocalTtlCache();

async function getUser(userId) {
  // Check cache first
  const cached = cache.get(`user:${userId}`);
  if (cached) return cached;

  // Not in cache or expired, fetch it
  const user = await fetch(`/api/users/${userId}`).then(r => r.json());

  // Store for 5 minutes, but serve stale for 1 more minute while refreshing
  cache.set(`user:${userId}`, user, {
    ttl: 5 * 60 * 1000,
    staleWindow: 1 * 60 * 1000,
    tags: `user:${userId}`, // Tag it for easy invalidation
  });

  return user;
}

// When a user updates their profile
function handleUserUpdate(userId) {
  cache.invalidateTag(`user:${userId}`); // Instantly clear their cache
}
```

### Session Management

Keep sessions alive while automatically expiring them:

```javascript
const cache = new LocalTtlCache({
  defaultTtl: 30 * 60 * 1000, // 30-minute sessions by default
});

function createSession(userId) {
  const sessionId = generateId();
  cache.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
}

function validateSession(sessionId) {
  const session = cache.get(sessionId);
  return session ? true : false;
}
```

### Database Query Caching

Speed up repeated database queries:

```javascript
const cache = new LocalTtlCache({
  defaultTtl: 2 * 60 * 1000, // 2 minutes
});

async function getProducts() {
  const cached = cache.get("products:list");
  if (cached) return cached;

  const products = await db.query("SELECT * FROM products");
  cache.set("products:list", products, { tags: "products" });
  return products;
}

async function deleteProduct(id) {
  await db.query("DELETE FROM products WHERE id = ?", [id]);
  cache.invalidateTag("products"); // Clear all product caches
}
```

---

## Configuration

Customize the cache behavior when creating it:

```javascript
const cache = new LocalTtlCache({
  defaultTtl: 5 * 60 * 1000, // All items expire after 5 minutes by default
  defaultStaleWindow: 1 * 60 * 1000, // Serve stale data for 1 minute after expiration
  maxSize: 100_000, // Don't store more than 100,000 items
});
```

---

## API Reference

### Creating a Cache

```javascript
const cache = new LocalTtlCache(options);
```

### Methods

#### `set(key, value, options)`

Store a value in the cache.

```javascript
cache.set("user:1", userData, {
  ttl: 5000, // Optional: expires in 5 seconds
  staleWindow: 2000, // Optional: serve stale for 2 more seconds
  tags: ["users"], // Optional: tags for group invalidation
});
```

#### `get(key)`

Retrieve a value from the cache.

```javascript
const value = cache.get("user:1");
```

#### `delete(key)`

Remove a specific key from the cache.

```javascript
cache.delete("user:1");
```

#### `invalidateTag(tags)`

Mark all entries with a specific tag as expired.

```javascript
cache.invalidateTag("users"); // Single tag
cache.invalidateTag(["users", "posts"]); // Multiple tags
```

#### `size`

Check how many items are in the cache.

```javascript
console.log(cache.size); // 42
```

---

## When to Use Short-Live

✅ **Perfect for:**

- API response caching
- Session management
- Database query caching
- Temporary data storage
- In-memory stores where you want automatic cleanup
- Reducing load on external services

❌ **Not ideal for:**

- Persistent data that needs to survive restarts (use a database instead)
- Data requiring complex querying (use a database instead)
- Scenarios where you need guaranteed data consistency across multiple instances

---

## Performance

Short-Live is built for speed:

- **Fast reads & writes** - O(1) lookups
- **Automatic cleanup** - Runs intelligently in the background
- **Memory efficient** - Smart management of expired data
- **Scales well** - Tested with millions of items

---

## License

MIT © [Daniel Hernández Ochoa](https://github.com/DanhezCode)

---

## Contributing

We'd love your help! Check out [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

**Questions? Found a bug?** [Open an issue](https://github.com/neezco/short-live/issues) on GitHub.
