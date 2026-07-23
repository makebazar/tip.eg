---
name: naming-conventions
description: File, component, variable, and function naming conventions for this project. Covers the existing patterns: Client.tsx suffix for client components, actions by folder, DB naming. Use when creating new files, components, actions, or database entities to stay consistent with the existing codebase.
---

# Naming Conventions

Consistency reduces cognitive load. Match these patterns exactly when creating new files.

## File Names

| What | Pattern | Example |
|------|---------|---------|
| Page (App Router) | `page.tsx` | `app/waiter/dashboard/page.tsx` |
| Layout | `layout.tsx` | `app/restaurant/layout.tsx` |
| Client Component | `<Name>Client.tsx` | `WaiterDashboardClient.tsx` |
| Server Component | `<Name>.tsx` | `TippingForm.tsx` (if server) |
| Server Actions | `app/actions/<domain>.ts` | `app/actions/payments.ts` |
| UI primitives | `components/ui/<name>.tsx` | `components/ui/button.tsx` |
| Shared components | `components/<Name>.tsx` | `components/SharedLayoutWrapper.tsx` |
| DB / lib | `lib/<name>.ts` | `lib/db.ts`, `lib/utils.ts` |

## Components

```tsx
// PascalCase for components
export function WaiterDashboardClient() { ... }
export function TippingForm() { ... }

// Suffix "Client" for components with "use client"
// No suffix for Server Components
"use client"
export function RestaurantDashboardClient() { ... }
```

## Variables and Functions

```ts
// camelCase for variables and functions
const waiterId = "..."
const amountTip = 10

function getWaiterById(id: string) { ... }
function processMockPayment(data: PaymentData) { ... }

// SCREAMING_SNAKE for true constants (never change)
const MAX_TIP_AMOUNT = 10_000
const DEFAULT_TIP_PERCENTAGE = 15
```

## TypeScript Types and Interfaces

```ts
// PascalCase, descriptive
interface WaiterProfile { ... }
type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED"
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

// DB row types — match the table name
interface TransactionRow { id: string; amount_tip: number; ... }
interface WaiterProfileRow { id: string; restaurant_id: string; ... }
```

## Database

Match existing schema style:

```sql
-- Tables: snake_case plural
waiter_profiles, tip_splits, transactions, restaurants

-- Columns: snake_case
amount_tip, payment_status, created_at, restaurant_id

-- IDs: text, prefixed pattern
-- tx-${Date.now()}  for transactions
-- fb-${Date.now()}  for feedback
-- split-${Date.now()}-waiter  for tip splits

-- Status enums: SCREAMING_SNAKE
payment_status: 'PENDING' | 'COMPLETED' | 'FAILED'
role: 'SUPER_ADMIN' | 'RESTAURANT_MANAGER' | 'WAITER'
tip_distribution_mode: 'INDIVIDUAL' | 'EQUAL_SPLIT' | 'CUSTOM_SPLIT'
```

## CSS / Tailwind

```tsx
// className order: layout → box model → typography → visual → state
<div className="flex flex-col gap-4 p-6 text-sm font-medium bg-white rounded-xl shadow hover:shadow-md" />

// Custom CSS variables: kebab-case, scoped
--color-brand: ...
--radius-card: ...
--font-heading: ...
```

## Server Actions

```ts
// Verb + noun, camelCase, exported from actions/*.ts
export async function processPayment() { ... }   // ✅
export async function createWaiter() { ... }      // ✅
export async function updateRestaurant() { ... }  // ✅
export async function deleteTable() { ... }       // ✅

// Not: handlePayment, doCreate, submitForm
```

## Props

```tsx
// Descriptive, not abbreviated
interface Props {
  waiterId: string        // ✅, not wId
  restaurantId: string    // ✅, not restId
  onPaymentSuccess: () => void  // ✅ event handlers: on + PastTense
  isLoading: boolean      // ✅ booleans: is/has/can prefix
  translations: Translations  // ✅ full name, not t or trans
}
```
