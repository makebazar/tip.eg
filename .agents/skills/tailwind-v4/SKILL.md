---
name: tailwind-v4
description: Rules and patterns for Tailwind CSS v4, which uses a CSS-first configuration approach instead of tailwind.config.js. Covers the new @theme directive, CSS variables, custom utilities, and breaking changes from v3. Use when writing or editing CSS, adding custom colors/spacing/fonts, configuring themes, or when any Tailwind class doesn't seem to work as expected.
---

# Tailwind CSS v4

This project uses Tailwind v4. It is a **complete rewrite** with a CSS-first approach. Most v3 knowledge is wrong here.

## Key Difference: No `tailwind.config.js`

Configuration now lives in CSS, not JavaScript.

```css
/* globals.css */
@import "tailwindcss";

@theme {
  /* Custom design tokens */
  --color-brand: oklch(65% 0.2 260);
  --color-brand-dark: oklch(50% 0.2 260);
  --font-sans: "Inter", sans-serif;
  --spacing-18: 4.5rem;
  --radius-card: 0.75rem;
}
```

These generate utilities automatically: `bg-brand`, `text-brand`, `font-sans`, `p-18`, `rounded-card`.

## @theme Directive

All custom tokens go in `@theme {}`:

```css
@theme {
  /* Colors — generates bg-*, text-*, border-*, ring-* etc. */
  --color-primary: oklch(60% 0.25 270);
  --color-surface: oklch(98% 0.01 270);

  /* Typography */
  --font-heading: "Outfit Variable", sans-serif;
  --font-size-display: 3.5rem;

  /* Spacing — extends default scale */
  --spacing-13: 3.25rem;
  --spacing-15: 3.75rem;

  /* Breakpoints */
  --breakpoint-xs: 30rem;

  /* Animations */
  --animate-fade-in: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## CSS Variables vs Tailwind Tokens

Tailwind v4 **automatically bridges** `@theme` tokens to CSS variables:

```css
@theme {
  --color-primary: oklch(60% 0.25 270);
}
/* Generates: --color-primary CSS variable AND bg-primary, text-primary utilities */
```

Use `var(--color-primary)` in raw CSS, use `bg-primary` in className.

## Arbitrary Values

Still supported with `[]` syntax:
```html
<div class="w-[347px] bg-[oklch(60%_0.2_270)] mt-[13px]" />
```

## Breaking Changes from v3

| v3 | v4 |
|----|-----|
| `tailwind.config.js` | `@theme {}` in CSS |
| `theme.extend.colors` | `--color-*` in `@theme` |
| `@apply` with config values | `@apply` still works, use token names |
| `purge` / `content` config | Automatic content detection |
| `dark:` with class strategy | `@media (prefers-color-scheme: dark)` or `.dark` selector |
| `screens` config | `--breakpoint-*` in `@theme` |
| Plugin system (JS) | `@utility` and `@variant` in CSS |

## Custom Utilities

```css
@utility flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@utility card-shadow {
  box-shadow: 0 1px 3px oklch(0% 0 0 / 0.1), 0 1px 2px oklch(0% 0 0 / 0.06);
}
```

Now usable as `class="flex-center card-shadow"`.

## Custom Variants

```css
@variant hocus (&:hover, &:focus) ;
@variant supports-grid (@supports (display: grid)) ;
```

Usage: `hocus:bg-primary`, `supports-grid:grid`.

## Dark Mode

```css
/* Option 1: System preference */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: oklch(15% 0.02 270);
  }
}

/* Option 2: Class-based (.dark on <html>) */
@variant dark (&:where(.dark, .dark *)) ;
```

## Common Mistakes

- ❌ Creating `tailwind.config.js` — not needed, hurts v4
- ❌ `theme.extend` in JS config — use `@theme` in CSS
- ❌ `@tailwind base/components/utilities` directives — replaced by `@import "tailwindcss"`
- ❌ Expecting `purge`/`content` array — v4 auto-detects
- ❌ Using `tw-` prefix plugin pattern — use `@utility` instead
