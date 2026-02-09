# Contribution Workflow

## 1. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

Use conventional commit types for branch names:

- `feat/` for features
- `fix/` for bug fixes
- `docs/` for documentation
- `refactor/` for refactoring

## 2. Make Your Changes

Follow the [Code Style Guidelines](code-style.md).

## 3. Verify Your Work

Run the full check suite before committing:

```bash
pnpm check:all
```

This runs formatting, linting, and type checking in parallel.

## 4. Commit with Conventional Commits

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

### Examples

```bash
git commit -m "feat: add has method to LocalTtlCache"
git commit -m "fix: prevent expired entries from being returned"
git commit -m "test: add test coverage for stale window behavior"
git commit -m "docs: update API reference"
```

## 5. Push and Create a Pull Request

```bash
git push origin feat/your-feature-name
```

Then create a pull request on GitHub:

- Reference any related issues
- Provide a clear description of your changes
- Ensure all tests and checks pass

---

**That's it!** The maintainers will review your PR soon.
