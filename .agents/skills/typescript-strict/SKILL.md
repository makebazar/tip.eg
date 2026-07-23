---
name: typescript-strict
description: TypeScript strict mode patterns for this React/Next.js project. Covers avoiding 'any', proper typing of React components, async functions, API responses, and event handlers. Use whenever writing TypeScript, reviewing types, or when TypeScript errors appear. Also triggers on "type this", "fix the types", "typescript error", or "strict types".
---

# TypeScript Strict Patterns

This project uses TypeScript with strict mode. No `any` without justification. Types are documentation.

## Core Rules

- **No `any`** — use `unknown` when the type is truly unknown, then narrow it.
- **No non-null assertion (`!`)** without a comment explaining why it's safe.
- **No type assertions (`as X`)** without narrowing or a clear reason.
- Prefer `interface` for object shapes that will be extended; `type` for unions, intersections, aliases.

## React Component Types

```tsx
// Props — use interface
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean      // optional with ?
  variant?: "primary" | "ghost"
}

// Component — return type is inferred, explicit is optional
function Button({ label, onClick, disabled = false }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>
}

// Children — use React.ReactNode
interface CardProps {
  children: React.ReactNode
  className?: string
}

// Polymorphic / HTML element extension
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}
```

## Event Handlers

```tsx
// ✅ Type event handlers properly
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value)
}

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
}

const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.stopPropagation()
}

// ✅ Short form when type is inferred from JSX
<input onChange={(e) => setValue(e.target.value)} />
```

## Async / Data Fetching

```ts
// Type the return explicitly for Server Actions and fetch helpers
async function getUser(id: number): Promise<User | null> {
  const row = db.prepare<[number], User>("SELECT * FROM users WHERE id = ?").get(id)
  return row ?? null
}

// Server Action result type
type ActionResult =
  | { success: true; data: User }
  | { success: false; error: string }

async function createUser(formData: FormData): Promise<ActionResult> { ... }
```

## Narrowing Unknown

```ts
// API response / unknown data
function parseUser(raw: unknown): User {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "id" in raw &&
    "name" in raw
  ) {
    return raw as User // safe assertion after narrowing
  }
  throw new Error("Invalid user data")
}

// Zod is the best option for runtime validation (if installed)
import { z } from "zod"
const UserSchema = z.object({ id: z.number(), name: z.string() })
type User = z.infer<typeof UserSchema>
```

## Utility Types

Use built-in utility types — don't reinvent them:

```ts
Partial<User>           // all fields optional
Required<User>          // all fields required
Pick<User, "id"|"name"> // subset of fields
Omit<User, "password">  // exclude fields
Record<string, number>  // dictionary
NonNullable<User|null>  // remove null/undefined
ReturnType<typeof fn>   // infer return type
Parameters<typeof fn>   // infer param types
```

## Common Mistakes

- ❌ `const x: any = ...` — use `unknown` then narrow
- ❌ `(x as SomeType).property` without narrowing — add a type guard
- ❌ `useState<any>([])` — type the state: `useState<User[]>([])`
- ❌ `e: any` in event handlers — use the proper React event type
- ❌ `// @ts-ignore` — fix the type instead, or use `// @ts-expect-error` with a reason comment
- ❌ Prop type as `object` or `{}` — always be specific
