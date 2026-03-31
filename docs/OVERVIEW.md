# MediCare (Pixel Cup) - App Overview

This repo contains a centralized health tracking + appointment app built with Next.js App Router. It is used by:
- Web users (desktop/mobile web)
- Android clients that call the same HTTP APIs

## Core Features

- Auth (Firebase): Email/password login, Google login, phone OTP login.
- Doctors catalog: Admin-managed doctors with multiple medical fields and multiple hospital venues.
- Appointments: User booking flow with Razorpay payment (INR 200) before appointment creation.
- Appointment lifecycle: `sent` -> `pending_approval` -> `approved/rejected` (or `cancelled`).
- Venue-aware confirmations: Admin can confirm appointment and change venue if required.
- Notifications: Appointment lifecycle events + admin message board notifications.
- Health tracker: Daily metrics (heart rate, BP, weight, sugar) with charting.

## Frontend Routes (App Router)

- `/` - Home
- `/appointments` - Razorpay-backed booking, status, and notifications
- `/doctors` - Doctor directory with fields and hospital venues
- `/health-tracker` - Health trends + input form
- `/emergency` - Emergency page
- `/admin` - Hidden admin dashboard

## Data Storage (MongoDB)

DB name: `medicare`

Collections:
- `users` - user profile records
- `doctors` - doctors with fields and hospitals
- `appointments` - appointment requests, statuses, venue, payment metadata
- `paymentIntents` - Razorpay order intents for booking flow
- `notifications` - patient notifications + admin messages
- `healthData` - daily health metrics
- `adminSettings` - singleton admin credentials (hashed)

## Environment Variables

Required:
- `MONGODB_URI`
- `ADMIN_DEFAULT_PASSWORD`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Firebase public config (required for web auth):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Optional:
- `ADMIN_TOKEN_SECRET` (recommended; if missing, server uses a stable local fallback)
- `ADMIN_DEFAULT_USERNAME` (defaults to `admin`)
- `RAZORPAY_ORDER_URL` (defaults to `https://api.razorpay.com/v1/orders`)
- `NEXT_PUBLIC_RAZORPAY_CHECKOUT_URL` (defaults to `https://checkout.razorpay.com/v1/checkout.js`)
- `NEXT_PUBLIC_RAZORPAY_PAYMENT_BUTTON_ID` (only needed for hosted Razorpay payment-button embeds)

## Security Note

Most patient APIs still identify users via body/query `uid` without server-side Firebase ID token verification.

For production:
- Send Firebase ID tokens from Android/web (`Authorization: Bearer <firebase-id-token>`)
- Verify tokens in patient API routes
