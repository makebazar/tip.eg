---
name: framer-motion-patterns
description: Patterns for Framer Motion v12 in React 19 and Next.js. Covers animation variants, layout animations, gesture animations, scroll animations, and performance rules. Use when adding animations, transitions, gestures, or scroll effects. Also use when Framer Motion isn't working as expected or when the user asks how to animate something.
---

# Framer Motion v12 Patterns

This project uses Framer Motion v12 with React 19. Some APIs changed in v11/v12.

## Basic Motion

```tsx
import { motion } from "framer-motion"

// Simple animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>
```

## Variants — Prefer Over Inline Props

Variants keep animations organised and enable stagger:

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

// Parent controls children via variants
<motion.ul variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

## Gestures

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
/>

// Drag
<motion.div
  drag
  dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
  dragElastic={0.1}
/>
```

## Layout Animations

Animate layout changes automatically:

```tsx
// Add layoutId to animate between positions
<motion.div layoutId="card" />

// Animate any layout change
<motion.div layout />

// Shared element transition (e.g., modal expanding from card)
// Card:
<motion.div layoutId="hero-image" />
// Modal:
<motion.div layoutId="hero-image" />
```

## AnimatePresence — Required for Exit Animations

```tsx
import { AnimatePresence, motion } from "framer-motion"

<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      key="unique-key"  // required for AnimatePresence
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  )}
</AnimatePresence>
```

## Scroll Animations

```tsx
import { motion, useScroll, useTransform } from "framer-motion"

function ParallaxSection() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"])

  return (
    <div ref={ref}>
      <motion.div style={{ y }} />
    </div>
  )
}
```

## useAnimate — Programmatic Control

```tsx
import { useAnimate } from "framer-motion"

function Component() {
  const [scope, animate] = useAnimate()

  async function handleClick() {
    await animate(scope.current, { x: 100 }, { duration: 0.5 })
    await animate(scope.current, { x: 0 }, { duration: 0.3 })
  }

  return <div ref={scope} onClick={handleClick} />
}
```

## Performance Rules

- **`will-change: transform`** — Framer Motion adds this automatically for transforms; don't add it manually.
- **Animate `transform` and `opacity`** — these are GPU-accelerated. Avoid animating `width`, `height`, `margin`, `top/left` (triggers layout).
- **`layout` prop is expensive** — only use when you actually need layout animation; skip it otherwise.
- **`useMotionValue` + `useTransform`** for scroll/mouse tracking — avoids React re-renders.
- In Next.js, `motion` components that use `useScroll`/`useMotionValue` must be in Client Components.

## Next.js / React 19 Gotchas

- All `motion.*` components are Client Components — if you use them in a Server Component, it won't error but they lose their animation context.
- Wrap animated sections in `"use client"` components; keep data fetching in Server Component parents.
- `AnimatePresence` must be in a Client Component.

## Common Mistakes

- ❌ No `key` prop on children of `AnimatePresence` — exit animations won't work
- ❌ Animating layout-triggering properties (`width`, `height`) — use `scale` or `layout` instead
- ❌ Using `motion` in a Server Component file — add `"use client"`
- ❌ Inline variant objects on every render — define variants outside the component
- ❌ `initial={false}` forgotten on `AnimatePresence` when you don't want mount animations on first load
