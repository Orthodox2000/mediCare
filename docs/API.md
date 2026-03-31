# MediCare API Reference (Web + Android)

Base URL:
- `https://medi-care-roan.vercel.app/`

All JSON requests should send:
- `Content-Type: application/json`

## Common Types

### AppointmentStatus
`sent` | `pending_approval` | `approved` | `rejected` | `cancelled`

### PaymentStatus
`not_required` | `initiated` | `paid` | `failed` | `cancelled`

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

- User auth is handled by Firebase Auth in the client.
- Admin auth uses a server-issued token from `/api/admin/login`.
  - Provide `Authorization: Bearer <token>` to admin endpoints.

## Users

### Check if email exists
`GET /api/users?exists=1&email=<email>`

### Upsert profile
`POST /api/users`

### Fetch profile
`GET /api/users?uid=<firebase-uid>` or `GET /api/users?email=<email>`

## Doctors

### List doctors (public)
`GET /api/doctors`

Response:
```json
{
  "data": [
    {
      "_id": "...",
      "name": "Dr. Example",
      "specialty": "Cardiology",
      "fields": ["Cardiology", "General Medicine"],
      "hospitals": ["SWACS Hospital", "MetroCare Hospital"]
    }
  ],
  "meta": {
    "hospitals": [
      "SWACS Hospital",
      "MetroCare Hospital",
      "City General Hospital",
      "Lifeline Multispecialty Hospital",
      "Sunrise Medical Center"
    ]
  }
}
```

Notes:
- Hospital names are selector-based and normalized server-side.
- `SWACS Hospital` is included in the canonical hospital list.

### Admin doctor CRUD
- `POST /api/doctors`
- `PATCH /api/doctors`
- `DELETE /api/doctors?id=<doctorId>`
- `POST /api/doctors/bootstrap` (admin-only sample data bootstrap)

Create/update body supports:
- `name: string`
- `fields: string[]` (multi-field doctor)
- `hospitals: string[]` (must match selector list)
- `experience`, `imageUrl`, `rating`, `patients`

Bootstrap response includes:
- `inserted`, `updated`, `seeded`, `total`

## Appointments

### Patient list appointments
`GET /api/appointments?uid=<firebase-uid>`

Behavior:
- Any appointment with `status="sent"` is auto-promoted to `pending_approval` after the grace window.
- Promotion generates a notification.

### Patient cancel appointment
`DELETE /api/appointments?uid=<firebase-uid>&id=<appointmentId>`

Marks status as `cancelled` and generates a notification.

### Legacy direct create (non-payment flow)
`POST /api/appointments`

Body supports:
- `doctor`, `specialty`, `venue`, `date`, `time`, `reason`
- Optional payment fields for server/internal usage:
  - `paymentStatus`, `paymentAmount`, `paymentCurrency`
  - `paymentOrderId`, `paymentId`, `paymentSignature`, `paymentFailureReason`

## Razorpay Booking Flow (INR 200)

### 1) Create payment order
`POST /api/appointments/payment/order`

Body:
```json
{
  "uid": "firebase-uid",
  "patientEmail": "user@example.com",
  "patientName": "User Name",
  "doctor": "Dr. Example",
  "specialty": "Cardiology",
  "venue": "SWACS Hospital",
  "date": "YYYY-MM-DD",
  "time": "10:00 AM",
  "reason": "optional"
}
```

Response:
```json
{
  "data": {
    "keyId": "rzp_key_xxx",
    "orderId": "order_xxx",
    "amountPaise": 20000,
    "amount": 200,
    "currency": "INR",
    "doctor": "Dr. Example",
    "specialty": "Cardiology",
    "venue": "SWACS Hospital",
    "date": "YYYY-MM-DD",
    "time": "10:00 AM"
  }
}
```

### 2) Verify payment and finalize booking
`POST /api/appointments/payment/verify`

Success body:
```json
{
  "uid": "firebase-uid",
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature",
  "outcome": "success"
}
```

Cancelled/failed body:
```json
{
  "uid": "firebase-uid",
  "razorpayOrderId": "order_xxx",
  "outcome": "cancelled",
  "failureReason": "Checkout window was closed before payment."
}
```

Behavior:
- `success`: signature verified, appointment created with `status="sent"` and `paymentStatus="paid"`.
- `failed/cancelled`: appointment stored as `status="cancelled"` with payment failure reason.

## Notifications

### List
`GET /api/notifications?uid=<firebase-uid>`

### Mark read
`POST /api/notifications`
```json
{ "uid": "firebase-uid", "id": "<notificationId>", "action": "mark_read" }
```

## Admin APIs

All admin endpoints require:
`Authorization: Bearer <admin-token>`

Bootstrap/security note:
- If `adminSettings` does not exist yet, first login bootstraps it from env variables:
  - `ADMIN_DEFAULT_USERNAME` (optional, defaults to `admin`)
  - `ADMIN_DEFAULT_PASSWORD` (required for first bootstrap)
  - `ADMIN_TOKEN_SECRET` (recommended; if missing, server uses a stable local fallback)

### Admin login
`POST /api/admin/login`

### Admin settings
`PATCH /api/admin/settings`

### Admin patients
- `GET /api/admin/patients?q=<search>`
- `PATCH /api/admin/patients`

### Admin appointments
- `GET /api/admin/appointments?doctor=<name>&status=<status>&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- `PATCH /api/admin/appointments`

Patch body:
```json
{
  "id": "appointmentId",
  "status": "approved",
  "venue": "SWACS Hospital"
}
```

Notes:
- `status` and `venue` can be updated together.
- Admin can update only venue (without changing status).
- Venue is validated against selected doctor's hospital list.

### Admin message board
`POST /api/admin/messages`
