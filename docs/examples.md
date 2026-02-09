# Examples

Learn Short-Live through practical examples for common use cases.

---

## 📚 Learning Examples

Core concepts for using Short-Live effectively.

### [Tag-Based Invalidation](./examples/tag-based-invalidation.md)

Learn how to manage cache invalidation—when to use tags and when to use direct deletion.

**Key concepts:**

- `cache.delete()` vs `cache.invalidateTag()`
- Single tag vs multiple tags
- When tags are worth the overhead
- Performance considerations

### [Stale Windows](./examples/stale-window.md)

Master stale windows to control memory usage and improve responsiveness.

**Key concepts:**

- What stale windows are and how they work
- `purgeStaleOnGet` for tight memory constraints
- `purgeStaleOnSweep` for efficient batch cleanup
- Stale-while-revalidate pattern
- Per-entry stale window customization

---

## Navigation

- **[Getting Started](./getting-started.md)** - Installation and setup
- **[API Reference](./api-reference.md)** - All methods explained
- **[Configuration](./configuration.md)** - Customize your cache
