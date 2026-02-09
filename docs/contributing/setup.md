# Setting Up Your Environment

## Prerequisites

This repository comes pre-configured with:

- **ESLint** for linting
- **Prettier** for formatting
- **Husky** for Git hooks
- **Conventional Commits** validation
- **Type checking** and **test scripts**

## Installation

1. **Fork and clone** the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/cache.git
   cd cache
   ```

2. **Add upstream repository**:

   ```bash
   git remote add upstream https://github.com/neezco/cache.git
   ```

3. **Install dependencies**:

   ```bash
   pnpm install
   ```

4. **Initialize Husky** for Git hooks:

   ```bash
   pnpm prepare
   ```

## What Husky Does

Once initialized, Husky automatically validates your changes:

| Hook           | What it runs                        |
| -------------- | ----------------------------------- |
| **Pre-commit** | ESLint, Prettier, and type checking |
| **Pre-push**   | Full test suite                     |

You're ready to start contributing!
