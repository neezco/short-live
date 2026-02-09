# Contributing to Neezco Cache

Thank you for your interest in contributing to Neezco Cache! We'd love your help.

---

## 🐛 Opening Issues

Found a bug or have a feature request? Please open an issue on GitHub.

### Bug Reports

When reporting a bug, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Node.js version, OS, etc.)

### Feature Requests

When requesting a feature, please:

- Describe what you want to achieve
- Explain why this feature would be useful
- Provide any examples or use cases

**[Open an issue](https://github.com/neezco/cache/issues)** on GitHub to get started.

---

## 💻 Contributing Code

Ready to submit a pull request? Follow these steps:

### 1. Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork locally**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/cache.git
   cd cache
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/neezco/cache.git
   ```

### 2. Set Up Your Environment

```bash
pnpm install
```

Then initialize Husky for Git hooks:

```bash
pnpm prepare
```

Once initialized, Husky automatically validates your changes:

- **Pre-commit**: Runs ESLint, Prettier, and type checking
- **Pre-push**: Runs the full test suite

### 3. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

Use conventional commit types for your branch names:

- `feat/` for features
- `fix/` for bug fixes
- `docs/` for documentation
- `refactor/` for refactoring

### 4. Make Your Changes

Follow the [Code Style Guidelines](#code-style-guidelines) below.

### 5. Check Everything Before Committing

Run the full check suite:

```bash
pnpm check:all
```

This runs formatting, linting, and type checking in parallel.

### 6. Commit with Conventional Commits

```bash
git commit -m "feat: add your feature"
```

Husky validates your commit message. Use these types:

| Type        | Purpose                                   |
| ----------- | ----------------------------------------- |
| `feat:`     | A new feature                             |
| `fix:`      | A bug fix                                 |
| `docs:`     | Documentation changes                     |
| `style:`    | Formatting only (no code changes)         |
| `refactor:` | Code refactoring without behavior changes |
| `test:`     | Adding or updating tests                  |
| `chore:`    | Maintenance tasks (configs, tooling, CI)  |

**Examples:**

```bash
git commit -m "feat: add has method to LocalTtlCache"
git commit -m "fix: prevent expired entries from being returned"
git commit -m "test: add test coverage for stale window behavior"
git commit -m "docs: update API reference"
```

### 7. Push and Create a Pull Request

```bash
git push origin feat/your-feature-name
```

Then create a pull request on GitHub:

- Reference any related issues
- Provide a clear description of your changes
- Ensure all tests and checks pass

---

## 🏗️ Project Structure

Neezco Cache follows a **functional, domain-driven architecture**:

```
src/
├── index.ts              # Public API exports and LocalTtlCache class
├── types.ts              # Type definitions
├── defaults.ts           # Default configuration values
├── cache/                # Core caching operations
│   ├── set.ts            # Set/update cache entries
│   ├── get.ts            # Get entries (with expiration/stale checks)
│   ├── delete.ts         # Delete entries
│   ├── clear.ts          # Clear entire cache
│   ├── invalidate-tag.ts # Tag-based invalidation
│   ├── has.ts            # Check key existence
│   ├── size.ts           # Get cache size
│   ├── entries.ts        # Iterate over entries
│   ├── validators.ts     # Entry status validators
│   └── create-cache.ts   # Cache initialization
├── sweep/                # Automatic cleanup operations
│   ├── sweep.ts          # Main sweep loop
│   └── ...               # Optimization utilities
└── utils/                # Utilities (memory monitoring, etc.)
```

### 🎯 Core Philosophy

- **Pure Functions First**: All business logic is implemented as pure functions
- **Dependency Injection**: Dependencies that can change are injected
- **Simple & Testable**: Each function has a single responsibility
- **Type Safety**: Strict TypeScript typing throughout

The [`LocalTtlCache`](src/index.ts) class is a convenience wrapper around these pure functions.

---

## 💡 Code Style Guidelines

This project prioritizes **functional programming with controlled mutability for maximum performance**. All code follows these principles:

### Core Principles

- **Pure Functions First**: All business logic implemented as pure functions without side effects
- **One Function = One Responsibility**: Keep functions small and focused on a single task
- **Dependency Injection**: Inject dependencies when they can change or have multiple implementations
- **Explicit Behavior**: Functions only do what they promise, with no hidden state or implicit behavior
- **Strict Type Safety**: Avoid `any` and use precise, verifiable TypeScript types
- **Controlled Mutability**: State mutations are explicit and localized, never global
- **Testable in Isolation**: Functions must be testable without global dependencies or magical dependencies

### Documentation Standards

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

## 📋 Prerequisites

This repository comes pre-configured with:

- **ESLint** for linting
- **Prettier** for formatting
- **Husky** for Git hooks
- **Conventional Commits** validation in pre-commit
- **Type checking** and **test scripts**

---

## 📂 Available Scripts

### 🔨 Build

Transpiles TypeScript to JavaScript.

```bash
pnpm build
```

### 🔄 Build Watch

Watches for file changes and rebuilds automatically.

```bash
pnpm build:watch
```

### 🔍 Lint

Runs ESLint to detect code quality issues.

```bash
pnpm lint
```

### 🛠️ Fix Lint Issues

Automatically fixes ESLint problems when possible.

```bash
pnpm lint:fix
```

### 🎨 Format with Prettier

Formats the entire codebase using Prettier.

```bash
pnpm format:prettier
```

### ✅ Format All

Runs linting fixes and Prettier formatting together.

```bash
pnpm format:all
```

### 🧪 Type Check

Runs TypeScript's type checker without emitting files.

```bash
pnpm typecheck
```

### ✨ Check All

**Run this before committing.** Runs formatting and type checking in parallel.

```bash
pnpm check:all
```

### 🧪 Tests

Runs the test suite once.

```bash
pnpm test
```

### 👀 Tests Watch

Runs tests in watch mode. Useful during development.

```bash
pnpm test:watch
```

### 📊 Test Coverage

Generates test coverage reports.

```bash
pnpm test:coverage
```

---

## ❓ Questions?

Feel free to open a discussion or issue on GitHub. We're happy to help!

---

**Thank you for contributing to Neezco Cache! 🎉**
