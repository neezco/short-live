# Project Structure

Neezco Cache follows a **functional, domain-driven architecture**.

## Directory Layout

```
src/
├── index.ts              # Public API exports and LocalTtlCache class
├── types.ts              # Type definitions
├── defaults.ts           # Default configuration values
├── cache/                # Core caching operations
│   ├── set.ts            # Set/update cache entries
│   ├── get.ts            # Get entries (with expiration/stale checks)
│   ├── delete.ts         # Delete entries
│   └── ...
├── sweep/                # Automatic cleanup operations
│   ├── sweep.ts          # Main sweep loop
│   └── ...               # Optimization utilities
└── utils/                # Utilities (memory monitoring, etc.)
    └── ...
```

## Core Philosophy

- **Pure Functions First**: All business logic is implemented as pure functions
- **Dependency Injection**: Dependencies that can change are injected
- **Simple & Testable**: Each function has a single responsibility
- **Type Safety**: Strict TypeScript typing throughout

The [`LocalTtlCache`](../../src/index.ts) class is a convenience wrapper around these pure functions. It provides object-oriented API while maintaining functional code inside.

---

**When adding new functionality:** Follow the domain structure. Create functions in the appropriate `src/` subdirectory.
