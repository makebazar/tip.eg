---
name: i18n-patterns
description: Internationalization patterns for this project — EN/AR with RTL support. Covers how to use the TRANSLATIONS system, add new keys, handle RTL layouts, and avoid common i18n mistakes. Use when adding new UI text, new languages, or when fixing RTL layout issues.
---

# i18n Patterns — EN / AR RTL

This project uses a hand-rolled i18n system in `src/lib/translations.ts`. No external library — keep it that way.

## How It Works

```ts
// src/lib/translations.ts
export type Language = "en" | "ar"

export const TRANSLATIONS: Record<Language, Translations> = {
  en: { ... },
  ar: { ... },
}
```

Language is passed as a prop or read from URL params/cookies depending on the route.

## Adding New Translation Keys

**Step 1** — Add to the `Translations` interface:
```ts
export interface Translations {
  // ...existing keys...
  myNewKey: string
}
```

**Step 2** — Add to BOTH `en` and `ar` objects. Never add to one only — TypeScript will catch it but don't rely on that:
```ts
en: {
  myNewKey: "English text here",
},
ar: {
  myNewKey: "النص العربي هنا",
}
```

**Step 3** — Use in component via the `t` (translations) prop:
```tsx
<p>{t.myNewKey}</p>
```

## RTL Layout Rules

Arabic is RTL. `dir="rtl"` must be set on the container:

```tsx
// ✅ Set dir on the root element when language is AR
<div dir={lang === "ar" ? "rtl" : "ltr"}>
  {/* All children inherit direction */}
</div>
```

### CSS for RTL — Use Logical Properties

Logical properties flip automatically with `dir`:

```css
/* ✅ Use logical — works in both LTR and RTL */
padding-inline-start: 1rem;   /* = padding-left in LTR, padding-right in RTL */
padding-inline-end: 1rem;
margin-inline-start: auto;
border-inline-start: 2px solid;

/* ❌ Avoid physical — breaks in RTL */
padding-left: 1rem;
margin-left: auto;
border-left: 2px solid;
```

### Tailwind RTL Classes

```html
<!-- ✅ Use RTL variants in Tailwind v4 -->
<div class="text-left rtl:text-right">
<div class="pl-4 rtl:pr-4 rtl:pl-0">

<!-- ✅ Or use logical property classes -->
<div class="ps-4">    <!-- padding-inline-start -->
<div class="me-2">    <!-- margin-inline-end -->
```

### Flexbox in RTL

Flex row direction reverses automatically with RTL — **be aware**:

```css
/* This will go right-to-left in RTL — usually what you want */
flex-direction: row;

/* Force LTR order even in RTL */
flex-direction: row;
direction: ltr;  /* use sparingly — overrides parent dir */
```

### Icons and Directional Arrows

Some icons need to mirror in RTL (arrows, chevrons):

```tsx
<ChevronRight
  className={cn("size-4", lang === "ar" && "rotate-180")}
/>
```

## Number and Currency Formatting

Arabic uses Eastern Arabic numerals in some contexts. Use `Intl`:

```ts
// ✅ Locale-aware number formatting
const formatAmount = (amount: number, lang: Language) =>
  new Intl.NumberFormat(lang === "ar" ? "ar-AE" : "en-US", {
    style: "currency",
    currency: "AED",
  }).format(amount)
```

## Common Mistakes

- ❌ Adding a key to `en` but forgetting `ar` — TypeScript catches it but don't rely on this
- ❌ Hardcoding English text in JSX instead of using `t.key`
- ❌ Using `padding-left` / `margin-left` in CSS — use logical properties
- ❌ Not setting `dir="rtl"` on the container — text alignment and flex order will be wrong
- ❌ Assuming icons are symmetric — directional icons (arrows) need to mirror in RTL
- ❌ Concatenating translated strings — word order differs between languages, use template strings within a single key
