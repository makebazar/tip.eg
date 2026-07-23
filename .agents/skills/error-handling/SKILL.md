---
name: error-handling
description: Error handling standards for Server Actions, database operations, and payment flows. Covers the ActionResult return type pattern, what to show users vs log internally, and rules for financial operations. Use when writing Server Actions, handling payment errors, or deciding what to return from an action that can fail.
---

# Error Handling Patterns

## Server Action Return Type

All Server Actions that can fail must return a typed result — never throw to the client:

```ts
// ✅ Standard result type — use this everywhere
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

// Usage
export async function createItem(formData: FormData): Promise<ActionResult<Item>> {
  try {
    const item = db.prepare("INSERT INTO items ...").run(...)
    return { success: true, data: item }
  } catch (err) {
    console.error("[createItem]", err)
    return { success: false, error: "Failed to create item" }  // vague to user
  }
}
```

## What to Log vs What to Show Users

| Situation | Log (server) | Show user |
|-----------|-------------|-----------|
| DB error | Full error + query context | "Something went wrong, try again" |
| Payment failure | Full error + transaction ID | "Payment failed. Try again." |
| Validation error | Nothing (expected) | Specific message: "Name is required" |
| Auth error | IP + cookie + timestamp | "Invalid email or password" |
| Not found | Nothing | "Not found" |

**Rule: Never leak stack traces, DB column names, or internal IDs to the user.**

```ts
// ✅
console.error("[processMockPayment] DB error:", error, { waiterId, billId })
return { success: false, error: "Payment processing failed" }

// ❌ — leaks internals
return { success: false, error: error.message }
```

## Payment Operations — Extra Rules

Payments touch money. Extra care:

```ts
// ✅ Always use db.transaction() for any multi-step payment
const run = db.transaction(() => {
  // 1. Insert transaction record FIRST
  db.prepare("INSERT INTO transactions ...").run(...)
  // 2. Update balances
  db.prepare("UPDATE waiter_profiles SET balance = balance + ? WHERE id = ?").run(amount, waiterId)
  // If step 2 throws, step 1 is rolled back automatically
})

try {
  run()
  return { success: true, transactionId }
} catch (err) {
  console.error("[payment] Transaction failed:", err, { waiterId, amountTip })
  return { success: false, error: "Payment processing failed" }
}
```

- **Generate transaction IDs before the transaction** — so you can log the ID even on failure.
- **Never do partial writes** — if tip distribution fails, the whole transaction must roll back.
- **Log the full context on payment failure** — `waiterId`, `billId`, `amounts` — needed for debugging.

## Client-Side Error Display

```tsx
"use client"
import { useActionState } from "react"

function PaymentForm() {
  const [state, action, isPending] = useActionState(processPayment, null)

  return (
    <form action={action}>
      {state?.success === false && (
        <p className="text-red-500 text-sm">{state.error}</p>
      )}
      <button disabled={isPending}>
        {isPending ? "Processing..." : "Pay Now"}
      </button>
    </form>
  )
}
```

## Validation Pattern

Validate input at the top of every Server Action, before touching the DB:

```ts
export async function createWaiter(formData: FormData): Promise<ActionResult> {
  const name = formData.get("name")?.toString().trim()
  const email = formData.get("email")?.toString().trim()

  if (!name) return { success: false, error: "Name is required" }
  if (!email || !email.includes("@")) return { success: false, error: "Valid email required" }

  // Only reach DB after validation passes
  try {
    db.prepare("INSERT INTO ...").run(name, email)
    return { success: true }
  } catch (err) {
    console.error("[createWaiter]", err)
    return { success: false, error: "Failed to create waiter" }
  }
}
```

## Common Mistakes

- ❌ `return { error: error.message }` — leaks internals
- ❌ `throw error` from a Server Action — Next.js shows a generic error page
- ❌ Multi-step DB writes without `db.transaction()` — partial state on crash
- ❌ No `console.error` on catch — impossible to debug production issues
- ❌ Showing "success" before confirming DB write succeeded
