# Changelog

All notable changes to this project will be documented in this file.

## 0.4.0 (2026-02-14)

* chore: implement startSweep function to manage cache sweep process ([78ded7a](https://github.com/neezco/cache/commit/78ded7a))
* chore: install semantic-release plugins and add unified release script ([5b7a8b3](https://github.com/neezco/cache/commit/5b7a8b3))
* test: add comprehensive tests for LocalTtlCache purge strategies and basic operations ([a410f2d](https://github.com/neezco/cache/commit/a410f2d))
* test: ensure tag invalidation does not affect entries created after the tag ([9282397](https://github.com/neezco/cache/commit/9282397))
* fix: enforce stale window upper bound when applying tag-based stale invalidation ([593c1d4](https://github.com/neezco/cache/commit/593c1d4)), closes [#19](https://github.com/neezco/cache/issues/19)
* feat: enhance cache purging strategy with configurable thresholds ([ee762c1](https://github.com/neezco/cache/commit/ee762c1))
* feat: refactor purge configuration logic and enhance validation for thresholds ([350b9de](https://github.com/neezco/cache/commit/350b9de)), closes [#18](https://github.com/neezco/cache/issues/18)
* style: add conventional-changelog-conventionalcommits package for improved changelog generation ([5435048](https://github.com/neezco/cache/commit/5435048))
* style: simplify commit-analyzer plugin configuration ([ecff6a0](https://github.com/neezco/cache/commit/ecff6a0))
* style: update release notes generator configuration for improved changelog formatting ([1ac4776](https://github.com/neezco/cache/commit/1ac4776))

# [0.3.0](https://github.com/neezco/cache/compare/v0.2.1...v0.3.0) (2026-02-11)


### Features

* enhance cache retrieval with metadata support in `get()` method ([eb198d6](https://github.com/neezco/cache/commit/eb198d66c9e1abda86c448fb81a35f14e376a79c)), closes [#17](https://github.com/neezco/cache/issues/17)

## [0.2.1](https://github.com/neezco/cache/compare/v0.2.0...v0.2.1) (2026-02-11)


### Performance Improvements

* optimize cache entry validation by introducing pre-computed status handling ([bafb6a0](https://github.com/neezco/cache/commit/bafb6a024b0082a1b81f2d0e959c883df4136976))

# [0.2.0](https://github.com/neezco/cache/compare/v0.1.1...v0.2.0) (2026-02-09)


### Bug Fixes

* add regex for todo-tree to enhance tag recognition ([e0c3292](https://github.com/neezco/cache/commit/e0c3292cd83f5e6d1c5cd9b9c2e199b4a7c9eda0))


### Features

* add maxMemorySize configuration and update cache behavior for size limits ([fb3f173](https://github.com/neezco/cache/commit/fb3f173b891fc4f345596904ad82b606e5cbc00c))

## [0.1.1](https://github.com/neezco/cache/compare/v0.1.0...v0.1.1) (2026-02-09)


### Bug Fixes

* update `invalidateTag` method to use `InvalidateTagOptions` for extensibility ([8184098](https://github.com/neezco/cache/commit/8184098a3b7eed24dc8ebf211b4929f4b383b4a9))
