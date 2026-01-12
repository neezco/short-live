import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",

  // Outputs
  format: ["esm", "cjs"],
  dts: true,
  exports: true,

  // Optimizations
  minify: false,
  sourcemap: true,
  clean: true,

  // External dependencies
  external: [],

  // Additional options
  treeshake: true,
  target: "es2022",

  // Watch mode
  watch: process.env.TSDOWN_WATCH === "true",
});
