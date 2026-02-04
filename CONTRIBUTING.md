# Contributing to Short-Live

Thank you for your interest in contributing to Short-Live! This guide will help you get started.

---

## 🔄 Making a Pull Request

1. **Fork the repository** on GitHub by clicking the **Fork** button in the top right corner

2. **Clone your fork locally**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/short-live.git
   cd short-live
   ```

3. **Add the upstream repository**:

   ```bash
   git remote add upstream https://github.com/neezco/short-live.git
   ```

4. **Create a feature branch**:

   ```bash
   git checkout -b feat/your-feature-name
   ```

5. **Make your changes** following the project structure and philosophy

6. **Commit with Conventional Commits**:

   ```bash
   git commit -m "feat: add your feature"
   ```

7. **Push to your fork**:

   ```bash
   git push origin feat/your-feature-name
   ```

8. **Create a Pull Request** by navigating to the original repository and clicking "New Pull Request"
   - Reference any related issues
   - Provide a clear description of your changes
   - Ensure all tests and checks pass

---

## 📋 Prerequisites

This repository comes pre-configured with:

- **ESLint** for linting
- **Prettier** for formatting
- **Husky** for Git hooks
- **Conventional Commits** validation in pre-commit
- **Type checking** and **test scripts**

---

## 🚀 Installation

Install dependencies using your preferred package manager:

```bash
pnpm install
```

### 🔧 Initialize Husky

After installing dependencies, you must run the `prepare` script:

```bash
pnpm prepare
```

Once initialized, Husky automatically validates your changes:

**Before every commit** (`pre-commit`), Husky will:

- Run ESLint and Prettier formatting
- Check TypeScript types
- **Validate commit messages using Conventional Commits**

**Before every push** (`pre-push`), Husky will:

- Run the full test suite to ensure code quality

This ensures consistent, clean, and safe commits.

---

## 🏗️ Project Structure

Short-Live follows a **functional, domain-driven architecture**:

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

## 📝 Conventional Commits

This repository enforces **Conventional Commits** automatically during `pre-commit`.  
If your commit message does not follow the standard, the commit will be rejected.

### Common commit types

| Type          | Purpose                                        |
| ------------- | ---------------------------------------------- |
| **feat:**     | A new feature                                  |
| **fix:**      | A bug fix                                      |
| **docs:**     | Documentation changes                          |
| **style:**    | Formatting only (no code changes)              |
| **refactor:** | Code refactoring without behavior changes      |
| **test:**     | Adding or updating tests                       |
| **chore:**    | Maintenance tasks (configs, tooling, CI, etc.) |

### Examples

```bash
git commit -m "feat: add invalidateTag method to LocalTtlCache class"
git commit -m "fix: prevent expired entries from being returned"
git commit -m "test: add test coverage for stale window behavior"
git commit -m "docs: update README with tag invalidation examples"
```

---

## 📂 Available Scripts

You can run these commands with **pnpm**, **npm**, **yarn**, or **bun**.

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

Runs `format:all` and `typecheck` in parallel. **Run this before committing.**

```bash
pnpm check
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

## 🚀 Submitting Changes

1. **Create a branch** for your changes:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following the project structure and philosophy

3. **Run the full check** before committing:

   ```bash
   pnpm check
   ```

4. **Commit with Conventional Commits**:

   ```bash
   git commit -m "feat: add your feature"
   ```

5. **Push and create a pull request**:
   ```bash
   git push origin feat/your-feature-name
   ```

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

## 🐛 Reporting Issues

Found a bug? Please:

1. Check if it's already reported in [GitHub Issues](https://github.com/neezco/short-live/issues)
2. Provide:
   - Clear description of the issue
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (Node.js version, OS, etc.)

---

## ❓ Questions?

Feel free to open a discussion or issue on GitHub. We're happy to help!

---

**Thank you for contributing to Short-Live! 🎉**
