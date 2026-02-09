# Code Style Guidelines

This project prioritizes **functional programming with controlled mutability for maximum performance**.

## Core Principles

- **Pure Functions First**: All business logic implemented as pure functions without side effects
- **One Function = One Responsibility**: Keep functions small and focused on a single task
- **Dependency Injection**: Inject dependencies when they can change or have multiple implementations
- **Explicit Behavior**: Functions only do what they promise, with no hidden state or implicit behavior
- **Strict Type Safety**: Avoid `any` and use precise, verifiable TypeScript types
- **Controlled Mutability**: State mutations are explicit and localized, never global
- **Testable in Isolation**: Functions must be testable without global dependencies

## Documentation Standards

- Use **advanced TSDoc** for all functions: document purpose, parameters, return types, and edge cases
- Adjust documentation level to actual complexity
- Document technical or internal information with inline comments or TSDoc
- Update `/doc` directory only for externally relevant or highly complex features
- Keep explanations direct, user-focused, and free of internal implementation details

### Example

```typescript
/**
 * Validates if an entry is fresh and can be used.
 * @param state - The cache state.
 * @param entry - The cache entry to validate.
 * @param now - The current timestamp.
 * @returns True if the entry is fresh, false otherwise.
 */
export const isFresh = (state: CacheState, entry: CacheEntry, now: number): boolean => {
  return entry[0][1] > now;
};
```

---

**Remember:** Keep it simple, keep it functional, keep it tested.
