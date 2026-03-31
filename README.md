## MediCare (Pixel Cup) - Web + Android API Backend

Centralized health tracking + appointment booking app built with Next.js App Router. The same HTTP APIs are used by web UI and Android clients.

## Getting Started

```bash
npm run dev
```

Open `http://localhost:3000`.

Seed sample doctors (10 entries, upsert):
```bash
npm run bootstrap:doctors
```

### Environment

Create a `.env` file and set at minimum:
- `MONGODB_URI`
- `ADMIN_DEFAULT_PASSWORD`
- `ADMIN_DEFAULT_USERNAME` (optional, defaults to `admin`)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_ORDER_URL` (optional, default: `https://api.razorpay.com/v1/orders`)
- `NEXT_PUBLIC_RAZORPAY_CHECKOUT_URL` (optional, default: `https://checkout.razorpay.com/v1/checkout.js`)
- `NEXT_PUBLIC_RAZORPAY_PAYMENT_BUTTON_ID` (optional if using hosted Razorpay button)
- `ADMIN_TOKEN_SECRET` (recommended; if missing, server uses a stable local fallback)
- Firebase public keys (`NEXT_PUBLIC_FIREBASE_*`)

## Documentation

- App overview: `docs/OVERVIEW.md`
- API reference: `docs/API.md`
- API changelog: `docs/CHANGELOG.md`

## Notes

- Admin UI route: `/admin`
- Patient APIs are not yet protected by Firebase ID token verification
