// Base ESLint configs
import js from "@eslint/js";
import ts from "typescript-eslint";

// Plugins
import globals from "globals";
import importPlugin from "eslint-plugin-import";
import { readFileSync } from "node:fs";
import { defineConfig } from "eslint/config";
// import reactPlugin from "eslint-plugin-react";

const gitignore = readFileSync(".gitignore", "utf8").split("\n").filter(Boolean);

export default defineConfig(
  /**
   * -------------------------------------------------------
   * Files and folders to ignore during linting
   * -------------------------------------------------------
   */

  {
    ignores: [
      // Gitignored files and folders
      ...gitignore,

      // NEXT: Ignore bench temporarily, remove later
      "bench",

      // Configuration files
      "*.config.{js,ts}",

      // Dependency folders
      "node_modules",

      // Lockfiles (pnpm, bun, npm, yarn)
      "pnpm-lock.yaml",
      "bun.lock",
      "package-lock.json",
      "yarn.lock",

      // Build artifacts
      "dist",
      "coverage",
      "build",
    ],
  },

  /**
   * -------------------------------------------------------
   * Base JavaScript recommended rules
   * -------------------------------------------------------
   */
  js.configs.recommended,

  /**
   * -------------------------------------------------------
   * TypeScript recommended rules
   * - Includes type-aware rules via recommendedTypeChecked
   * -------------------------------------------------------
   */

  ts.configs.recommendedTypeChecked,

  /**
   * Enable type-aware linting for TS files
   * (Required for rules that need type information)
   */
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  /**
   * -------------------------------------------------------
   * Import plugin configuration
   * - Enforces clean, consistent import ordering
   * - Alphabetizes imports
   * - Adds TypeScript resolver to avoid false positives
   * -------------------------------------------------------
   */
  {
    plugins: {
      import: importPlugin,
    },
    settings: {
      // Ensures eslint-plugin-import resolves TS paths correctly
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
          alwaysTryTypes: true,
        },
        node: {
          extensions: [".js", ".ts"],
        },
      },
    },
    rules: {
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },

  /**
   * -------------------------------------------------------
   * Global variables for browser and Node environments
   * -------------------------------------------------------
   */
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  /**
   * -------------------------------------------------------
   * Custom rules (your explicit, clean, no-magic style)
   * -------------------------------------------------------
   */
  {
    rules: {
      // Disable base rule and use TS version instead
      "no-unused-vars": "off",

      // Allow unused variables prefixed with "_"
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Allow console.warn and console.error only
      // "no-console": ["warn", { allow: ["warn", "error"] }],

      // Enforce consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },

  /**
   * -------------------------------------------------------
   * React support (commented out)
   * - Enables React linting rules
   * - Includes JSX runtime rules for React 17+
   * - Auto-detects installed React version
   * -------------------------------------------------------
   */
  // {
  //   files: ["**/*.jsx", "**/*.tsx"],
  //   plugins: {
  //     react: reactPlugin,
  //   },
  //   rules: {
  //     // Recommended React rules
  //     ...reactPlugin.configs.recommended.rules,
  //     // Rules for the new JSX transform (no need to import React)
  //     ...reactPlugin.configs["jsx-runtime"].rules,
  //   },
  //   settings: {
  //     react: {
  //       version: "detect", // Automatically detects installed React version
  //     },
  //   },
  // },

  /**
   * -------------------------------------------------------
   * Preact support (commented out)
   * - Enables Preact-specific JSX linting
   * - Uses eslint-plugin-react compatibility mode
   * - Works with @preact/preset-vite or Next.js + Preact
   * -------------------------------------------------------
   */
  // {
  //   files: ["**/*.jsx", "**/*.tsx"],
  //   plugins: {
  //     react: reactPlugin,
  //   },
  //   settings: {
  //     react: {
  //       pragma: "h", // Preact's JSX pragma
  //       version: "detect",
  //     },
  //     // Allows eslint-plugin-import to resolve Preact aliases
  //     "import/resolver": {
  //       alias: {
  //         map: [
  //           ["react", "preact/compat"],
  //           ["react-dom", "preact/compat"],
  //         ],
  //         extensions: [".js", ".jsx", ".ts", ".tsx"],
  //       },
  //     },
  //   },
  //   rules: {
  //     // React rules still apply because Preact uses the same JSX semantics
  //     ...reactPlugin.configs.recommended.rules,
  //   },
  // },
);
