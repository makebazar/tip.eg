---
name: git-commit
description: Conventional Commits standard for writing commit messages. Covers format, types, scope, breaking changes, and examples. Use when the user asks to write a commit message, "what should I commit this as", "git commit", or "commit message".
---

# Git Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

## Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE or issue refs]
```

- **Short description**: imperative mood, lowercase, no period, max 72 chars
- **Body**: explain *why*, not *what* (what is in the diff)
- **BREAKING CHANGE**: footer or `!` after type

## Types

| Type | Use when |
|------|---------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `perf` | Performance improvement, no feature change |
| `refactor` | Code restructure, no feature/fix |
| `style` | Formatting, whitespace — no logic change |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Build, deps, tooling, config |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverts a previous commit |

## Scopes (for this project)

Use the feature area or component name:

- `auth`, `db`, `api`, `ui`, `form`, `table`, `layout`, `nav`
- or a specific component: `tipping-form`, `shared-layout`, `table-state`

## Examples

```
feat(tipping-form): add tip percentage quick-select buttons

fix(db): use WAL mode to prevent locking on concurrent reads

refactor(table-state): replace useReducer with useState — logic was flat

perf(layout): lazy-load SharedLayoutWrapper to reduce initial bundle

chore(deps): upgrade framer-motion to v12.42

feat(api)!: change tip endpoint to return { success, data } envelope

BREAKING CHANGE: all callers must update to new response shape
```

## Rules

- One logical change per commit — don't mix feat + refactor
- If you need "and" in the description, split into two commits
- `fix` for bugs, `refactor` for restructuring working code — not interchangeable
- Don't end description with a period
- Use `!` or `BREAKING CHANGE` footer for changes that break the API/interface
