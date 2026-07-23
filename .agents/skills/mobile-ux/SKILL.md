---
name: mobile-ux
description: Mobile UX rules for touch-first interfaces. Covers tap target sizes, thumb zones, scroll behavior, input handling on mobile, and avoiding common mobile web pitfalls. Use when building or reviewing UI that will be used on smartphones — especially tipping forms, QR-scanned pages, or any page a guest interacts with at a restaurant table.
---

# Mobile UX Patterns

The tipping form (`/t/[waiterId]`) is used **exclusively on mobile** — scanned via QR code at a table. All guest-facing UI must be designed for thumbs, not mice.

## Tap Target Sizes

Minimum 44×44px for any interactive element (Apple HIG / WCAG):

```css
/* ✅ Minimum tap target */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1.5rem;
}

/* For icon-only buttons, add padding around the icon */
.icon-btn {
  padding: 0.75rem;  /* visual icon can be 24px, hit area is 44px */
}
```

In Tailwind:
```html
<button class="min-h-[44px] px-6 py-3">Pay Now</button>
```

## Thumb Zone

The bottom 2/3 of the screen is easy to reach. Critical actions go at the **bottom**:

```
┌─────────────────┐
│  Hard to reach  │  ← logos, read-only info
│  ─────────────  │
│  Reachable      │  ← secondary actions
│  ─────────────  │
│  Easy (thumb)   │  ← primary CTA (Pay Now, Submit)
└─────────────────┘
```

- Main CTA (`Pay Now`) → sticky at bottom or last in scroll
- Tip amount buttons → bottom half of viewport
- Rating stars → large, well-spaced, bottom half

## Input and Keyboard

```tsx
// ✅ Numeric inputs — prevent wrong keyboard type
<input
  type="number"
  inputMode="decimal"   // shows numeric keyboard on iOS/Android
  pattern="[0-9]*"      // helps older browsers
/>

// ✅ Prevent zoom on input focus (iOS zooms in when font-size < 16px)
input, textarea, select {
  font-size: 16px;  /* never below 16px on mobile */
}
```

## Scroll

- Avoid horizontal scroll — always full-width layout
- Use `-webkit-overflow-scrolling: touch` for smooth scroll on iOS (or `scroll-behavior: smooth`)
- Sticky elements must account for iOS safe areas:

```css
.sticky-bottom {
  position: sticky;
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom);  /* iPhone notch/home bar */
}
```

In Tailwind:
```html
<div class="sticky bottom-0 pb-[env(safe-area-inset-bottom)]">
```

## Visual Feedback for Touch

Every tap must give **immediate** visual feedback — no 300ms delay:

```css
/* Disable tap delay */
* { touch-action: manipulation; }

/* Active state for buttons */
.button:active {
  transform: scale(0.97);
  opacity: 0.85;
}
```

In Tailwind + Framer Motion:
```tsx
<motion.button
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Pay Now
</motion.button>
```

## Loading States

Mobile connections can be slow. Show loading state **immediately** on tap:

```tsx
const [isPending, startTransition] = useTransition()

// Or with useActionState
const [state, action, isPending] = useActionState(processPayment, null)

<button disabled={isPending}>
  {isPending ? <Spinner /> : "Pay Now"}
</button>
```

## Viewport Setup

Ensure correct meta tag in layout:

```tsx
// app/layout.tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,   // prevents user-zoom if you don't want it
}
```

## Tipping Form Specific Rules

- Tip amount buttons: minimum 52px height, full-width or 2-column grid
- Rating emoji buttons: at least 56px, well-spaced (users tap fast)
- Payment success screen: large, celebratory — user just paid, reward them
- Error state: prominent, red, retry button immediately visible without scroll
- QR scanning context: user is holding phone with one hand → one-thumb-operable layout

## Common Mistakes

- ❌ Buttons smaller than 44px — users miss-tap, frustrating on a payment flow
- ❌ `font-size < 16px` on inputs — iOS Safari zooms in, breaks layout
- ❌ No active/tap feedback — feels broken or slow
- ❌ CTA hidden below the fold — user doesn't know what to do next
- ❌ No loading state on payment submit — user taps multiple times → duplicate payments
- ❌ Forgetting `env(safe-area-inset-bottom)` on iPhone — button hidden behind home indicator
