# MediCare API Reference (Android + Web)

Base URL:
-  https://medi-care-roan.vercel.app/

All JSON requests should send:
- `Content-Type: application/json`

## Common Types

### AppointmentStatus
`sent` | `pending_approval` | `approved` | `rejected` | `cancelled`

### Notification
Stored in `notifications`:
```json
{
  "_id": "...",
  "uid": "firebase-uid",
  "type": "appointment.sent | appointment.pending_approval | appointment.approved | admin.message | ...",
  "title": "string",
  "message": "string",
  "createdAt": "Date",
  "readAt": "Date|null",
  "meta": { "appointmentId": "..." }
}
```

## Auth Model

- User auth is handled by **Firebase Auth** in the client.
- Admin auth uses a server-issued token from `/api/admin/login`.
  - Provide `Authorization: Bearer <token>` to admin endpoints.

## Users

### Check if an email exists
`GET /api/users?email=<email>`

Response:
```json
{ "exists": true }
```

Notes:
- Prefer `GET /api/users?exists=1&email=<email>` for existence-only checks.

### Upsert user profile
`POST /api/users`

Body:
```json
{
  "uid": "firebase-uid",
  "name": "string",
  "email": "string|null",
  "phone": "+911234567890|null",
  "provider": "password|google|phone",
  "photo": "string|null",
  "createdAt": "2026-03-25T10:00:00.000Z"
}
```

Response:
```json
{ "success": true }
```

### Fetch a user profile (no password is stored/returned)
`GET /api/users?email=<email>` or `GET /api/users?uid=<firebase-uid>`

Optional:
- `phone=+E164` — if DB phone is missing, the API validates and writes it (then returns updated profile).

Response:
```json
{ "exists": true, "data": { "uid": "...", "email": "...", "phone": "+91..." } }
```

### OPTIONS (method discovery / preflight)
`OPTIONS /api/users`

Response:
- Status: `204`
- Headers include:
  - `Allow: GET,POST,OPTIONS`
  - `Access-Control-Allow-Methods: GET,POST,OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`

## Recent Changes

See `docs/CHANGELOG.md` for a concise record of endpoint behavior changes (recommended for Android integration).

## Doctors

### List doctors (public)
`GET /api/doctors`

Response:
```json
{ "data": [ { "_id": "...", "name": "...", "specialty": "..." } ] }
```

## Appointments

### Patient: list appointments (auto-promotes `sent`)
`GET /api/appointments?uid=<firebase-uid>`

Behavior:
- Any appointment with `status="sent"` and `statusExpiresAt <= now` is promoted to `pending_approval`.
- A notification is generated when it becomes `pending_approval`.

### Patient: create appointment request
`POST /api/appointments`

Body:
```json
{
  "uid": "firebase-uid",
  "patientEmail": "user@example.com",
  "patientName": "User Name",
  "doctor": "Dr. X",
  "specialty": "Dermatologist",
  "date": "YYYY-MM-DD",
  "time": "10:00 AM",
  "reason": "optional"
}
```

Response includes:
- `status: "sent"`
- `statusExpiresAt: <Date>`

### Patient: cancel appointment
`DELETE /api/appointments?uid=<firebase-uid>&id=<appointmentId>`

Marks status `cancelled` and creates a notification.

## Notifications

### List notifications
`GET /api/notifications?uid=<firebase-uid>`

### Mark notification read
`POST /api/notifications`

Body:
```json
{ "uid": "firebase-uid", "id": "<notificationId>", "action": "mark_read" }
```

## Health Tracker

Metrics are stored in `healthData` keyed by `userId` (currently the user email).

### Add a health metric point
`POST /api/health/add`

Body:
```json
{
  "userId": "user@example.com",
  "date": "YYYY-MM-DD",
  "heartRate": 72,
  "bloodPressure": 120,
  "weight": 68.2,
  "sugar": 98
}
```

Notes:
- Metrics may be `null`, but at least one metric must be provided.

### Fetch points
`GET /api/health/add?userId=<email>`

Response:
```json
{
  "success": true,
  "data": [
    { "day": "YYYY-MM-DD", "heartRate": 72, "bloodPressure": 120, "weight": 68.2, "sugar": 98 }
  ]
}
```

## Admin APIs

All admin endpoints require:
`Authorization: Bearer <admin-token>`

### Admin login
`POST /api/admin/login`

Body:
```json
{ "username": "admin", "password": "Admin@123" }
```

Response:
```json
{ "token": "....", "expiresInSeconds": 3600 }
```

### Admin: change username/password
`PATCH /api/admin/settings`

Body:
```json
{
  "currentPassword": "Admin@123",
  "newUsername": "optional",
  "newPassword": "optional"
}
```

### Admin: manage doctors (CRUD)
- `POST /api/doctors`
- `PATCH /api/doctors`
- `DELETE /api/doctors?id=<doctorId>`

### Admin: patients
- `GET /api/admin/patients?q=<search>`
- `PATCH /api/admin/patients` (target by `targetEmail` preferred)

### Admin: appointments
- `GET /api/admin/appointments?doctor=<name>&status=<status>&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- `PATCH /api/admin/appointments` (approve/reject)

### Admin: message board
`POST /api/admin/messages`

Body:
```json
{
  "title": "string",
  "message": "string",
  "sendToAll": false,
  "emails": ["patient@example.com"]
}
```
