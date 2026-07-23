---
name: code-review
description: Structured code review checklist covering correctness, types, security, performance, and maintainability. Use when the user asks to review code, "check this", "review my PR", "look at this component", or "is this correct". Produces a focused, prioritized list of issues.
---

# Code Review Checklist

Produce a prioritized issue list. Format: `[SEVERITY] location: issue. fix.`

Severity levels: `BLOCK` (must fix), `WARN` (should fix), `NIT` (polish).

## Review Order

### 1. Correctness (BLOCK-level if wrong)
- Logic errors, wrong conditions, off-by-one, missing edge cases
- Race conditions, missing `await`, unhandled promise rejections
- Missing null/undefined checks before property access
- Mutation of props or state directly
- Stale closure capturing outdated values

### 2. Security (BLOCK-level if vulnerable)
- SQL injection: raw string interpolation in queries (use `?` placeholders)
- XSS: unsanitized user input rendered as HTML (`dangerouslySetInnerHTML`)
- Secrets in client-side code or environment variables without `NEXT_PUBLIC_` awareness
- Missing input validation on Server Actions
- Exposed internal error messages to the client

### 3. Types
- `any` without justification
- Non-null assertions (`!`) without explanation
- Type assertions (`as X`) without narrowing
- Missing return type on public functions

### 4. Performance
- Expensive computation inside render without `useMemo`
- New object/array created each render passed as prop (breaks memo)
- Missing `key` prop or using array index as key in dynamic lists
- Animating layout-triggering CSS properties (width, height, top, left)
- N+1 query pattern (query inside a loop)

### 5. React / Next.js Specifics
- `useEffect` with missing or wrong dependencies
- State update on unmounted component
- Server-only code imported in a Client Component
- Missing `"use client"` on component using hooks/events
- `forwardRef` used in React 19 (not needed — pass `ref` as prop)
- Missing `loading.tsx` / `error.tsx` for route segments with async data

### 6. Maintainability (NIT-level usually)
- Magic numbers/strings without a named constant
- Function doing more than one thing (name it — if it needs "and", split it)
- Duplicated logic that belongs in a shared helper
- Component over 200 lines (consider splitting)
- Missing or misleading comments on non-obvious logic

## Output Format

```
[BLOCK] src/actions/create.ts:12 — raw string interpolation in SQL query. Use ? placeholder.
[WARN]  src/components/List.tsx:34 — array index used as key. Use item.id instead.
[WARN]  src/components/Modal.tsx:8 — missing "use client" directive. Component uses useState.
[NIT]   src/utils/format.ts:5 — magic number 1000. Extract as const MILLISECONDS_PER_SECOND.
```

Only list real findings. No findings = "LGTM — no issues found." Don't pad with generic advice.
