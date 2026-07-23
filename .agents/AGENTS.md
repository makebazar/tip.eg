# TIp Project — Agent Rules

## Active Skills

The following skills are ALWAYS ACTIVE for this project. Read and apply them before writing any code:

### Always-On Skills (load every session)

- **`ponytail`** — minimum code, YAGNI, no over-engineering. Default mode always.
- **`next-dev`** — Next.js 16 App Router + React 19 conventions. Apply to ALL Next.js code.
- **`tailwind-v4`** — Tailwind v4 CSS-first config. Apply to ALL CSS and className work.
- **`typescript-strict`** — No `any`, proper React types, utility types. Apply to ALL TypeScript.
- **`naming-conventions`** — File, component, variable, DB naming patterns. Apply when creating anything new.
- **`error-handling`** — ActionResult pattern, what to log vs show. Apply to ALL Server Actions.

### Context-Triggered Skills (load when relevant)

- **`shadcn-patterns`** — Load when adding, editing, or customising UI components from shadcn.
- **`sqlite-patterns`** — Load when writing or touching any database query, schema, or migration.
- **`framer-motion-patterns`** — Load when adding, fixing, or reviewing animations.
- **`auth-patterns`** — Load when touching auth, protected routes, cookies, or roles.
- **`i18n-patterns`** — Load when adding UI text, new translation keys, or fixing RTL layout issues.
- **`mobile-ux`** — Load when working on guest-facing pages (`/t/*`), tipping form, or any phone UI.
- **`code-review`** — Load when the user asks to review code or check a file.
- **`git-commit`** — Load when the user asks for a commit message or git help.
- **`ponytail-review`** — Load when the user asks to simplify, cut, or review for over-engineering.

## Stack Quick Reference

- **Framework**: Next.js 16.2, App Router, React 19
- **Styling**: Tailwind CSS v4 (CSS-first, no tailwind.config.js)
- **UI**: shadcn/ui v4, lucide-react icons, framer-motion v12
- **DB**: better-sqlite3 (synchronous, server-only)
- **Language**: TypeScript strict mode
- **Animations**: framer-motion v12
- **i18n**: Hand-rolled EN/AR in `src/lib/translations.ts`
- **Auth**: Cookie-based, three roles: SUPER_ADMIN, RESTAURANT_MANAGER, WAITER

## General Rules

1. **Read before writing**: Always check existing code before adding new — reuse helpers, types, and patterns already in the codebase.
2. **Server-first**: Default to Server Components. Add `"use client"` only when required.
3. **No new dependencies** without a clear reason — check if existing deps (framer-motion, shadcn, lucide) already solve it.
4. **DB is server-only**: Never import `lib/db` in Client Components.
5. **One source of truth**: Don't duplicate logic. If it exists, find it and reuse it.
6. **Auth in every mutation**: Server Actions that mutate data must read identity from cookies, never from client input.
7. **Mobile-first for `/t/*`**: The tipping page is phone-only. 44px targets, thumb zones, no zoom traps.
8. **Consult Skills**: Before writing code, editing files, or making architectural decisions, always refer to the relevant project-scoped skills (`.agents/skills/<skill-name>/SKILL.md`) and follow their specific instructions.
9. **Unified Styling Standard (Tailwind CSS v4 + shadcn/ui)**: Always use Tailwind CSS v4 and shadcn/ui semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`) matching the project light theme (`#FAF9F5` Alabaster background, `#FFFFFF` cards, `#B58A1C` gold primary accent). NEVER create new `.module.css` files or use hardcoded dark classes (`bg-slate-950`). Maintain consistent layout container widths (`max-w-5xl`).

