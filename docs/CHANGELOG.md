# Changelog (API + Data Model)

## 2026-03-31 - Security hardening + admin queue stability

### What changed

- Removed hardcoded admin password defaults from source:
  - Admin UI no longer pre-fills a static default password.
  - Admin bootstrap now requires `ADMIN_DEFAULT_PASSWORD` from `.env`.
- Hardened admin token signing:
  - Removed fallback of admin token secret to `MONGODB_URI`.
  - Admin token signing now uses `ADMIN_TOKEN_SECRET` when set, otherwise a stable local fallback.
- Added missing admin env keys to `.env` template:
  - `ADMIN_TOKEN_SECRET`
  - `ADMIN_DEFAULT_USERNAME`
  - `ADMIN_DEFAULT_PASSWORD`
- Enforced FCFS ordering for admin appointment queue at API level:
  - `GET /api/admin/appointments` now sorts by `createdAt ASC, _id ASC`.
- Updated docs to reflect current env requirements and admin bootstrap behavior.

### Verification

- Sensitive-string scan excluding `.env*` files: no real keys/passwords found in source.
- Route stability check: `npm run build` passed and all app/API routes compiled successfully.

## 2026-03-31 - Doctors venues + Razorpay booking flow

### What changed

- Added multi-field and multi-hospital support in `doctors`:
  - `fields: string[]`
  - `hospitals: string[]` (selector-based normalized values)
  - Canonical hospital list now includes `SWACS Hospital`.
- Appointments now store venue and payment metadata:
  - `venue`
  - `paymentStatus`, `paymentAmount`, `paymentCurrency`
  - `paymentOrderId`, `paymentId`, `paymentSignature`, `paymentFailureReason`
- Added Razorpay payment flow endpoints:
  - `POST /api/appointments/payment/order`
  - `POST /api/appointments/payment/verify`
- Added doctor bootstrap endpoint:
  - `POST /api/doctors/bootstrap` seeds/upserts a 10-doctor sample set across multiple fields/hospitals.
- Admin can now update appointment venue during confirmation:
  - `PATCH /api/admin/appointments` supports `venue` and `status` in same request.
- Admin appointment venue updates now tolerate legacy doctor-name mismatches:
  - doctor lookup tries normalized matching (trim/lowercase),
  - if doctor no longer exists, venue still updates when it matches global hospital options.
- Notification messages now include venue context for appointment updates.
- Payment URLs are now env-configurable:
  - `RAZORPAY_ORDER_URL`
  - `NEXT_PUBLIC_RAZORPAY_CHECKOUT_URL`
- Added global route-loading UX:
  - root `app/loading.tsx` fallback
  - immediate click-to-progress top bar via `RouteProgress`.

### Why it changed

- Prevented hospital naming inconsistency by moving hospital names to a normalized selector model.
- Enabled real paid booking flow where payment of INR 200 happens before booking is sent to admin.
- Made admin confirmation workflow more practical by allowing venue correction at decision time.

### Backward compatibility notes

- Existing clients reading doctor `specialty` continue to work.
- New clients should consume `fields` and `hospitals` for richer doctor metadata.
- Direct `POST /api/appointments` still works for non-payment/internal flows, but web booking now uses Razorpay-first flow.

## 2026-03-28 - /api/users GET/OPTIONS update

### What changed

- Added `OPTIONS /api/users` so clients can inspect supported methods.
- Extended `GET /api/users` to support:
  - Existence check mode: `GET /api/users?exists=1&email=<email>` -> `{ exists: boolean }`
  - Profile mode: `GET /api/users?uid=<uid>` or `GET /api/users?email=<email>` -> `{ exists: boolean, data: user|null }`

### Why it changed

- Android/Web clients often need a single profile endpoint to fetch the latest user document and optionally update missing fields like phone.

### Backward compatibility notes

- Existing signup flows that only need existence checks should switch to:
  - `GET /api/users?exists=1&email=<email>`
- If a client still calls `GET /api/users?email=<email>`:
  - It still receives `exists`
  - It can also use `data` when present

### Phone write behavior

- Profile mode supports `phone=+E164`:
  - If DB phone is missing, the API validates the number and writes it.
  - If phone is already present, it does not overwrite it.
