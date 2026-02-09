# Tag-Based Invalidation

Learn how to manage cache invalidation with tags. **Important:** Use tags only when you truly need group invalidation. For known keys, `cache.delete()` is more efficient.

---

## When to Use Tags vs Direct Deletion

### ✅ Use `cache.delete(key)` when:

- You know the exact key to invalidate
- You're invalidating a single entry
- Performance is critical
- You have few related entries

```javascript
const cache = new LocalTtlCache();

cache.set("user:123", { name: "Alice" });
cache.set("user:456", { name: "Bob" });

// If you know the key, just delete it directly
cache.delete("user:123"); // Single O(1) operation
```

### 🏷️ Use `invalidateTag()` when:

- You don't know which keys are affected
- Multiple entries need invalidation together
- Data relationships are complex
- Convenience outweighs the performance cost

**Important:** Each tag associated with an entry adds overhead. Use tags strategically, not by default.

---

## Basic Tag Usage

Tags allow you to invalidate multiple entries with one call:

```javascript
const cache = new LocalTtlCache();

// Store user data with a 'users' tag
cache.set("user:123:profile", { name: "Alice" }, { tags: ["users"] });
cache.set("user:123:posts", [...], { tags: ["users"] });
cache.set("user:123:followers", [...], { tags: ["users"] });

// All three invalidated at once
cache.invalidateTag("users");

// All three are now expired
console.log(cache.get("user:123:profile")); // undefined
console.log(cache.get("user:123:posts")); // undefined
console.log(cache.get("user:123:followers")); // undefined
```

---

## Single vs Multiple Tags Per Entry

One entry can have one tag or multiple tags:

```javascript
// Single tag per entry
cache.set("product:42", productData, { tags: "products" });

// Multiple tags per entry - can be invalidated multiple ways
cache.set("post:456", postData, {
  tags: ["posts", "author:789", "published"],
});

// Any of these invalidates the post
cache.invalidateTag("posts"); // All posts
cache.invalidateTag("author:789"); // Posts by this author
cache.invalidateTag("published"); // All published content
```

---

## Designing Your Tag Strategy

Think carefully about the different ways you need to invalidate entries. Use tags that map to your domain concepts:

- **By resource type**: `"users"`, `"posts"`, `"products"`
- **By relationship**: `"author:789"`, `"follows:123"`, `"category:electronics"`
- **By state**: `"published"`, `"archived"`, `"pending"`
- **By context**: `"admin-only"`, `"premium-features"`, `"exports"`

Example: A blog post that belongs to multiple groups:

```javascript
cache.set("post:456", postData, {
  tags: [
    "posts", // Invalidate all posts
    "author:789", // Invalidate by author
    "category:technology", // Invalidate by category
    "published", // Invalidate by state
  ],
});

// When the author deletes their account
cache.invalidateTag("author:789");

// When you want to hide all published content
cache.invalidateTag("published");

// When the category is renamed
cache.invalidateTag("category:technology");
```

---

## Real-World Pattern: User Data

Let's look at a realistic scenario with multiple user-related caches:

```javascript
const cache = new LocalTtlCache({ defaultTtl: 5 * 60 * 1000 });

// ❌ AVOID THIS - Too many tags per entry
cache.set("user:123:profile", profileData, {
  tags: ["users", "user:123", "profiles", "public-data", "profiles:basic"],
});

// ✅ BETTER - Use tags only for necessary group invalidations
cache.set("user:123:profile", profileData, {
  tags: ["users"], // Single tag for bulk operations
});

// ✅ BEST - Use direct deletion when you know the key
if (userDeleted) {
  cache.delete("user:123:profile"); // Direct, efficient
  cache.delete("user:123:posts");
  cache.delete("user:123:followers");

  // Use tags only for complex relationships
  cache.invalidateTag("users"); // Clear all user lists
}
```

Compare the approaches:

```javascript
// Direct deletion - efficient when you know keys
cache.delete("user:123:profile"); // 1 operation, no tag overhead

// Tag invalidation - convenient for groups
cache.invalidateTag("users"); // Invalidates all user-related entries
// But processes every entry with that tag

// Mixed approach - best of both worlds
cache.delete("user:123:profile"); // Known entry
cache.invalidateTag("users"); // Group operations only
```

---

## Performance Consideration

Each tag on an entry adds a small memory and lookup cost. Keep tags minimal:

```javascript
// ❌ Avoid excessive tags
cache.set("data", value, {
  tags: ["all", "group1", "group2", "group3", "special"],
});

// ✅ Use only tags you'll actually invalidate
cache.set("data", value, {
  tags: ["group1"], // Only if you'll use cache.invalidateTag("group1")
});

// ✅ Prefer direct deletion for single entries
cache.delete("key");
```

---

## Next

- **[Stale Windows](./stale-window.md)** - Control memory with graceful expiration
- **[Back to Examples](../examples.md)**
