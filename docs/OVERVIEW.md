# MediCare (Pixel Cup) — App Overview

This repo contains a **centralized health tracking + appointments** app built with **Next.js App Router**. It is intended to be used by:
- Web users (PC/mobile web)
- An Android app calling the **same HTTP APIs** exposed by this Next.js server

## Core Features

- **Auth (Firebase)**: Email/password signup + login, Google login, phone OTP login, and phone-number enforcement for Google signups without a phone.
- **Appointments**: Patient sends appointment requests; status transitions from `sent` → `pending_approval` after ~5 seconds, then admin can approve/reject.
- **Health tracker**: Patient stores daily metrics (heart rate, systolic BP, weight, sugar) and sees an aligned 7-day chart with placeholder padding.
- **Notifications**: Patient receives notifications for appointment events + admin messages (message board).
- **Admin dashboard (hidden)**: Manage doctors, patients, appointment approvals, send targeted messages, change admin credentials.

## Frontend Routes (App Router)

- `/` — Home (shows latest notifications for logged-in users)
- `/appointments` — Appointment request + history + notifications
- `/doctors` — Doctors list (DB-backed, with fallback list)
- `/health-tracker` — Health trends + input form
- `/emergency` — Emergency page
- `/admin` — Hidden admin dashboard (requires admin login)

## Data Storage (MongoDB)

DB name: `medicare`

Collections:
- `users` — user profile records (upserted from client after auth)
- `appointments` — appointment requests + status
- `notifications` — patient notifications + admin messages
- `doctors` — doctor list managed by admin
- `healthData` — daily health metrics
- `adminSettings` — singleton admin credentials (hashed)

## Environment Variables

- `MONGODB_URI` (required) — MongoDB connection string
- Firebase public config (required for auth in web):
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- `ADMIN_TOKEN_SECRET` (optional) — secret for signing admin tokens. If not set, the app falls back to `MONGODB_URI` or `"dev-secret"`.

## Important Security Note (Android integration)

Most patient APIs currently identify a user via query/body fields like `uid` or `userId` (email) **without server-side verification of Firebase ID tokens**.

For production, you should:
- Send Firebase ID tokens from Android/web (`Authorization: Bearer <firebase-id-token>`)
- Verify tokens in API routes (admin routes are already token protected, patient routes are not)

