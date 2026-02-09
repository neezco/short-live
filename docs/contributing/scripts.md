# Available Scripts

Use these scripts during development:

## Building

| Script             | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `pnpm build`       | Transpiles TypeScript to JavaScript            |
| `pnpm build:watch` | Watches for changes and rebuilds automatically |

## Linting & Formatting

| Script                 | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `pnpm lint`            | Runs ESLint to detect code quality issues |
| `pnpm lint:fix`        | Automatically fixes ESLint problems       |
| `pnpm format:prettier` | Formats the entire codebase with Prettier |
| `pnpm format:all`      | Runs linting fixes and Prettier together  |

## Type Checking & Validation

| Script           | Purpose                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `pnpm typecheck` | Runs TypeScript type checker without emitting files                      |
| `pnpm check:all` | **Run before committing.** Runs formatting and type checking in parallel |

## Testing

| Script               | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `pnpm test`          | Runs the test suite once                             |
| `pnpm test:watch`    | Runs tests in watch mode (useful during development) |
| `pnpm test:coverage` | Generates test coverage reports                      |

---

**Before committing:** Always run `pnpm check:all` to ensure everything passes.
