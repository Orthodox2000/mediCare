## MediCare (Pixel Cup) — Web + Android API Backend

Centralized health tracking + appointment booking app built with **Next.js App Router**. The same HTTP APIs are intended to be used by the web UI and an Android app.

## Getting Started

```bash
npm run dev
```

Open `http://localhost:3000`.

### Environment
Create a `.env` file and set at minimum:
- `MONGODB_URI`
- Firebase public keys (`NEXT_PUBLIC_FIREBASE_*`)

## Documentation

- App overview: `docs/OVERVIEW.md`
- API reference (Android-friendly): `docs/API.md`
- API changelog: `docs/CHANGELOG.md`

## Notes

- Admin UI lives at hidden route `/admin`.
- Patient APIs are not yet protected by Firebase ID token verification; see `docs/OVERVIEW.md`.
