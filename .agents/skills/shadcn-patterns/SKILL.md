---
name: shadcn-patterns
description: Patterns for working with shadcn/ui components in this project. Covers how to add, customize, and extend shadcn components correctly, variant conventions, and how to avoid common mistakes with the shadcn CLI. Use when adding new UI components, customizing existing shadcn components, or working with class-variance-authority and tailwind-merge patterns.
---

# shadcn/ui Patterns

This project uses `shadcn` v4 with Tailwind CSS v4. Components live in `src/components/ui/`.

## Adding Components

Use the shadcn CLI to add components — never copy-paste manually:

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog card input
```

Check available components first:
```bash
npx shadcn@latest add --help
```

## Component Structure

shadcn components follow a consistent pattern with `class-variance-authority` (cva) for variants:

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "base-classes-here",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-input bg-transparent",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
        lg: "h-10 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}
```

## cn() Utility

Always use `cn()` from `@/lib/utils` to merge class names:

```tsx
import { cn } from "@/lib/utils"

// ✅ Correct — merges and deduplicates Tailwind classes
<div className={cn("p-4 bg-blue-500", className, isActive && "bg-green-500")} />

// ❌ Wrong — string concatenation breaks Tailwind merge
<div className={`p-4 bg-blue-500 ${className}`} />
```

## Customizing Components

1. **Edit `src/components/ui/*.tsx` directly** — shadcn components are owned by you, not a black box.
2. **Don't override with inline styles** — add a new variant instead.
3. **Extend, don't wrap** — add props to the existing component rather than creating a wrapper component.

```tsx
// ✅ Add a variant to the existing component
const buttonVariants = cva("...", {
  variants: {
    variant: {
      ...existing,
      danger: "bg-red-500 text-white hover:bg-red-600", // new variant
    },
  },
})

// ❌ Don't create a wrapper
function DangerButton(props) {
  return <Button className="bg-red-500" {...props} /> // loses variant system
}
```

## CSS Variables (Design Tokens)

shadcn uses CSS variables for theming. Defined in `globals.css`:

```css
:root {
  --background: oklch(...);
  --foreground: oklch(...);
  --primary: oklch(...);
  --primary-foreground: oklch(...);
  /* etc. */
}
```

- Use `bg-primary`, `text-foreground` etc. — never hardcode colors in components.
- To change theme: edit the CSS variables in `globals.css`, not individual components.

## Common Mistakes

- ❌ Installing shadcn components via npm instead of the CLI
- ❌ Modifying `node_modules` — components in `src/components/ui/` are yours to edit
- ❌ Using Tailwind classes directly on primitives instead of going through `cn()`
- ❌ Creating wrapper components instead of adding variants
- ❌ Hardcoding colors — use CSS variable tokens
