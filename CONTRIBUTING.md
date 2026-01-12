This repository comes pre-configured with:

- **ESLint** for linting
- **Prettier** for formatting
- **Husky** for Git hooks
- **Conventional Commits** validation in pre-commit
- **Type checking** and **test scripts**

---

### 🚀 Installation

Install dependencies using your preferred package manager:

```bash
pnpm install
```

### 🔧 Initialize Husky

After installing dependencies, you must run the `prepare` script:

```bash
pnpm prepare
```

Once initialized, **before every commit**, Husky will automatically:

- Run ESLint
- Format code with Prettier
- Check TypeScript types
- Run tests
- **Validate commit messages using Conventional Commits**

This ensures consistent, clean, and safe commits.

---

### 📝 Conventional Commits

This template enforces **Conventional Commits** automatically during `pre-commit`.  
If your commit message does not follow the standard, the commit will be rejected.

#### Common commit types

| Type          | Purpose                                        |
| ------------- | ---------------------------------------------- |
| **feat:**     | A new feature                                  |
| **fix:**      | A bug fix                                      |
| **docs:**     | Documentation changes                          |
| **style:**    | Formatting only (no code changes)              |
| **refactor:** | Code refactoring without behavior changes      |
| **test:**     | Adding or updating tests                       |
| **chore:**    | Maintenance tasks (configs, tooling, CI, etc.) |

---

### 📂 Available Scripts

You can run these commands with **pnpm**, **npm**, **yarn**, or **bun**.

#### 🔍 Lint

Runs ESLint to detect code issues.

```bash
pnpm lint
```

#### 🛠 Fix Lint Issues

Automatically fixes ESLint problems when possible.

```bash
pnpm lint:fix
```

#### 🎨 Format

Formats the entire codebase using Prettier.

```bash
pnpm format
```

#### 🧪 Type Check

Runs TypeScript’s type checker.

```bash
pnpm typecheck
```

#### 🧪 Tests

Runs Node.js test suite.

```bash
pnpm test
```

---
