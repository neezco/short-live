/** @type {import('semantic-release').GlobalConfig} */
export default {
  branches: ["main", { name: "develop", prerelease: "beta", channel: "beta" }],
  plugins: [
    ["@semantic-release/commit-analyzer", { preset: "conventionalcommits" }],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        changelogFile: "CHANGELOG.md",
        presetConfig: {
          types: [
            { type: "feat", section: "🚀 New Features", hidden: false },
            { type: "fix", section: "🐞 Bug Fixes", hidden: false },
            { type: "docs", section: "📚 Documentation Improvements", hidden: false },
            { type: "style", section: "🎨 Code Style & Formatting", hidden: false },
            { type: "refactor", section: "🔧 Code Refactoring", hidden: false },
            { type: "perf", section: "⚡ Performance Improvements", hidden: false },
            { type: "test", section: "🧪 Test Updates", hidden: false },
            { type: "chore", section: "📦 Internal Maintenance", hidden: false },
          ],
        },
      },
    ],
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
        changelogTitle:
          "# Changelog\n\nAll notable changes to this project will be documented in this file.",
      },
    ],
    ["@semantic-release/npm", { npmPublish: true }],
    ["@semantic-release/git", { assets: ["CHANGELOG.md"] }],
    "@semantic-release/github",
  ],
};
