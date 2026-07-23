---
name: next-dev
description: Rules and patterns for Next.js 16 App Router with React 19. Covers server vs client components, layouts, routing, server actions, data fetching, and breaking changes from previous versions. Use whenever working on this Next.js project, adding pages, layouts, API routes, or when the user asks about Next.js architecture, rendering, routing, or data fetching.
---

# Next.js 16 + React 19 Dev Rules

This project uses Next.js 16.2 with App Router and React 19. These versions have significant breaking changes from v13-15. **Always read `node_modules/next/dist/docs/` before writing unfamiliar APIs.**

## Server vs Client Components

- **Default: Server Component.** Every file in `app/` is a Server Component unless you add `"use client"`.
- Add `"use client"` only when you need: browser APIs, event handlers, `useState`, `useEffect`, or third-party client libs.
- **Never** import server-only code (DB, fs, secrets) into a Client Component.
- Push `"use client"` as far down the tree as possible — keep parents as Server Components.

```tsx
// ✅ Server Component — no directive needed
export default async function Page() {
  const data = await db.query(...)
  return <ClientWidget data={data} />
}

// ✅ Client Component — only what needs interactivity
"use client"
export function ClientWidget({ data }) { ... }
```

## App Router File Conventions

| File | Purpose |
|------|---------|
| `layout.tsx` | Shared UI that wraps children, persists across nav |
| `page.tsx` | Route leaf — renders the actual page |
| `loading.tsx` | Suspense fallback for the route segment |
| `error.tsx` | Error boundary for the route segment (`"use client"` required) |
| `not-found.tsx` | 404 UI for the segment |
| `route.ts` | API endpoint (replaces `pages/api/`) |

## Data Fetching

- **Server Components** — just `async/await` directly in the component. No `useEffect`, no `useState` for initial data.
- **Caching** — Next 16 uses React's `cache()` for deduplication. `fetch()` is no longer auto-cached like in Next 13/14.
- **Revalidation** — use `revalidatePath()` / `revalidateTag()` in Server Actions.

```tsx
// ✅ Direct async in Server Component
export default async function Page() {
  const rows = await getRows() // plain async function calling DB
  return <Table rows={rows} />
}
```

## Server Actions

Preferred over API routes for mutations from forms/buttons:

```tsx
// actions.ts
"use server"
export async function createItem(formData: FormData) {
  const name = formData.get("name") as string
  db.insert(name)
  revalidatePath("/items")
}

// Component
<form action={createItem}>
  <input name="name" />
  <button type="submit">Add</button>
</form>
```

- Always mark with `"use server"` at top of file or per-function.
- Validate input server-side — never trust client data.
- Return `{ error: string }` or `{ success: true }` for feedback.

## Routing

- Folder name = route segment: `app/users/[id]/page.tsx` → `/users/123`
- Route Groups `(group)/` — organise without affecting URL
- Parallel Routes `@slot/` — render multiple pages in one layout
- Intercepting Routes `(.)path` — modal-style overlays

## React 19 Specifics

- `use()` hook — read promises and context in render (replaces some `useEffect` patterns)
- `useFormStatus()` — pending state for forms with Server Actions
- `useOptimistic()` — optimistic UI updates
- `useActionState()` — replaces `useFormState` (renamed in React 19)
- `ref` is now a regular prop — no more `forwardRef()` wrapper needed

```tsx
// ✅ React 19 — ref as prop directly
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />
}
```

## Performance Rules

- Images: always use `next/image` with explicit `width`/`height` or `fill`.
- Fonts: use `next/font` — loads at build time, no layout shift.
- Dynamic imports: `next/dynamic` with `{ ssr: false }` for heavy client-only libs.
- Never import entire icon libraries — import individual icons.

## Common Mistakes to Avoid

- ❌ `useState` / `useEffect` in a Server Component — add `"use client"` or move logic
- ❌ `getServerSideProps` / `getStaticProps` — these are Pages Router, not App Router
- ❌ `pages/` directory mixed with `app/` unless intentionally using both
- ❌ Calling `fetch()` expecting auto-cache — it's opt-in in Next 16
- ❌ Using `useRouter().refresh()` to refetch server data — use `revalidatePath()` in actions instead
- ❌ `forwardRef()` wrapper in React 19 — pass `ref` as a prop directly
