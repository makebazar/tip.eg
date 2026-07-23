---
name: auth-patterns
description: Authentication and authorization patterns for this project. Covers cookie-based auth with three roles (SUPER_ADMIN, RESTAURANT_MANAGER, WAITER), how to guard pages and Server Actions, and common security rules. Use when adding new protected routes, new roles, checking auth in Server Actions, or fixing auth bugs.
---

# Auth Patterns

This project uses cookie-based auth with **no external auth library**. Three roles: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITER`.

## Cookie Map

| Cookie | Role | Redirects to |
|--------|------|-------------|
| `admin_session` | SUPER_ADMIN | `/admin/dashboard` |
| `restaurant_id` | RESTAURANT_MANAGER | `/restaurant/dashboard` |
| `waiter_id` | WAITER | `/waiter/dashboard` |

## Reading Auth in Server Components / Actions

```ts
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// Guard a page — put this at the top of page.tsx
export default async function WaiterPage() {
  const cookieStore = await cookies()
  const waiterId = cookieStore.get("waiter_id")?.value
  if (!waiterId) redirect("/waiter/login")

  // waiterId is now a trusted string
  const waiter = db.prepare("SELECT * FROM waiter_profiles WHERE id = ?").get(waiterId)
  if (!waiter) redirect("/waiter/login")  // cookie exists but profile deleted

  return <Dashboard waiter={waiter} />
}
```

## Guarding Server Actions

**Always** check the cookie inside Server Actions that mutate data — never trust data sent from the client:

```ts
"use server"
import { cookies } from "next/headers"

export async function updateProfile(data: FormData) {
  const cookieStore = await cookies()
  const waiterId = cookieStore.get("waiter_id")?.value
  if (!waiterId) return { error: "Not authenticated" }

  // Use waiterId from cookie, NOT from client-sent data
  db.prepare("UPDATE waiter_profiles SET name = ? WHERE id = ?")
    .run(data.get("name"), waiterId)

  return { success: true }
}
```

**The golden rule: ignore any IDs sent from the client for auth-sensitive operations. Read from cookie.**

## Adding a New Protected Route

1. Create `app/<section>/page.tsx`
2. First lines: read cookie → redirect if missing
3. Verify the entity still exists in DB → redirect if not
4. Pass only the needed data to Client Components (not the whole DB row)

```ts
// Pattern for every protected page
const cookieStore = await cookies()
const id = cookieStore.get("COOKIE_NAME")?.value
if (!id) redirect("/login-path")
```

## Roles and What They Can Access

| Role | Can access |
|------|-----------|
| `SUPER_ADMIN` | `/admin/*` — all restaurants, all users |
| `RESTAURANT_MANAGER` | `/restaurant/*` — own restaurant only |
| `WAITER` | `/waiter/*` — own profile only |
| (Public) | `/t/[waiterId]` — tipping form, no auth |

## Security Rules

- **Passwords** — currently stored as plaintext (`password_hash` column despite the name). Before going to production, hash with `bcrypt` or `argon2`.
- **httpOnly cookies** — already set. Never access auth cookies from client-side JS.
- **Cookie value = identity** — validate the value actually exists in the DB, don't just trust the cookie value exists.
- **Never trust `restaurant_id` from form data** — always read from the `restaurant_id` cookie or join through the session.
- **`redirect()` after login** — already correct in `auth.ts`. Never return the session data to client.

## Current Auth Code Location

- Actions: [`src/app/actions/auth.ts`](file:///c:/Users/Николай/Desktop/TIp/src/app/actions/auth.ts)
- Roles defined in DB `users` table, `role` column: `SUPER_ADMIN`, `RESTAURANT_MANAGER`, `WAITER`
