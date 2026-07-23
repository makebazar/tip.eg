---
name: sqlite-patterns
description: Patterns for working with better-sqlite3 in Next.js. Covers singleton DB connection, query patterns, type-safe queries, migrations, and Server Action integration. Use when writing database queries, creating new tables, adding migrations, or connecting DB to Server Actions or API routes.
---

# better-sqlite3 Patterns

This project uses `better-sqlite3` — a synchronous SQLite driver for Node.js. It runs **only on the server** (Server Components, Server Actions, API routes).

## Singleton Connection

Never create a new `Database()` on every request — use a singleton:

```ts
// lib/db.ts
import Database from "better-sqlite3"
import path from "path"

const DB_PATH = path.join(process.cwd(), "data", "app.db")

// Singleton — reuse across hot reloads in dev
const globalForDb = globalThis as unknown as { db: Database.Database }

export const db = globalForDb.db ?? new Database(DB_PATH)

if (process.env.NODE_ENV !== "production") globalForDb.db = db

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL")
```

## Query Patterns

better-sqlite3 is **synchronous** — no `await` needed:

```ts
import { db } from "@/lib/db"

// Prepare once, run many times (faster)
const getUser = db.prepare("SELECT * FROM users WHERE id = ?")
const insertUser = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)")

// Run
const user = getUser.get(userId)            // single row or undefined
const users = getUser.all()                 // array of rows
const result = insertUser.run(name, email)  // { changes, lastInsertRowid }
```

## Type-Safe Queries

Type the return value explicitly — better-sqlite3 returns `unknown` by default:

```ts
interface User {
  id: number
  name: string
  email: string
  created_at: string
}

const stmt = db.prepare<[], User>("SELECT * FROM users")
const users = stmt.all() // User[]

const getById = db.prepare<[number], User>("SELECT * FROM users WHERE id = ?")
const user = getById.get(userId) // User | undefined
```

## Transactions

Use `db.transaction()` for atomic operations:

```ts
const transfer = db.transaction((from: number, to: number, amount: number) => {
  debit.run(amount, from)
  credit.run(amount, to)
})

transfer(accountA, accountB, 100) // atomic — rolls back if either fails
```

## Migrations

Simple migration pattern without a heavy library:

```ts
// lib/migrations.ts
import { db } from "./db"

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}
```

Call `runMigrations()` once at app startup (e.g., in `instrumentation.ts`).

## Server Actions Integration

```ts
// app/actions.ts
"use server"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

const insertItem = db.prepare("INSERT INTO items (name) VALUES (?)")

export async function createItem(formData: FormData) {
  const name = formData.get("name") as string
  if (!name?.trim()) return { error: "Name is required" }

  insertItem.run(name.trim())
  revalidatePath("/items")
  return { success: true }
}
```

## Rules

- **Server-only** — never import `lib/db` in a Client Component or it will leak to the browser bundle.
- **Prepared statements** — prepare once at module level, not inside request handlers.
- **No raw string interpolation** in SQL — always use `?` placeholders to prevent SQL injection.
- **WAL mode** — always enable for Next.js (concurrent requests need it).
- **Sync is fine** — better-sqlite3 is intentionally synchronous and fast; don't `await` it.
