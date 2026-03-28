# Changelog (API + Data Model)

## 2026-03-28 — `/api/users` GET/OPTIONS update

### What changed

- Added `OPTIONS /api/users` so clients can inspect supported methods.
- Extended `GET /api/users` to support:
  - **Existence check mode**: `GET /api/users?exists=1&email=<email>` → `{ exists: boolean }`
  - **Profile mode**: `GET /api/users?uid=<uid>` or `GET /api/users?email=<email>` → `{ exists: boolean, data: user|null }`

### Why it changed

- Android/Web clients often need a **single profile endpoint** to fetch the latest user document and (optionally) update missing fields like phone.
- Some older client code used `GET /api/users?email=...` only to check `{ exists }`. Returning `{ exists, data }` keeps that flow from crashing while enabling profile reads.

### Backward compatibility notes

- Existing signup flows that only need existence checks should switch to:
  - `GET /api/users?exists=1&email=<email>`
- If a client still calls `GET /api/users?email=<email>`:
  - It will still receive `exists` (so older logic won’t break)
  - It can also use `data` when present

### Phone write behavior

- Profile mode supports `phone=+E164`:
  - If the DB record has no phone, the API validates the number and writes it.
  - If phone is already present, it does not overwrite it.

