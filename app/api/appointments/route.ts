import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/app/lib/mongo";
import { isIsoDate, normalizeFields, normalizeHospital, normalizeHospitals } from "@/app/lib/appointmentConfig";

type AppointmentStatus = "sent" | "pending_approval" | "approved" | "rejected" | "cancelled";
type PaymentStatus = "not_required" | "initiated" | "paid" | "failed" | "cancelled";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const allowedPaymentStatuses = new Set<PaymentStatus>([
  "not_required",
  "initiated",
  "paid",
  "failed",
  "cancelled",
]);

const getAppointmentMessage = (data: {
  doctor: string;
  date: string;
  time: string;
  venue?: string | null;
}) => `${data.doctor} | ${data.date} | ${data.time} | Venue: ${data.venue || "TBD"}`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const uid = asString(url.searchParams.get("uid"));
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  const db = await getMongoDb();
  const appointments = db.collection("appointments");
  const notifications = db.collection("notifications");

  const now = new Date();

  const toPromote = await appointments
    .find({
      uid,
      status: "sent",
      statusExpiresAt: { $lte: now },
      pendingNotifiedAt: { $exists: false },
    })
    .project({ _id: 1, doctor: 1, date: 1, time: 1, venue: 1 })
    .toArray();

  if (toPromote.length) {
    const ids = toPromote.map((d) => d._id);
    await appointments.updateMany(
      { _id: { $in: ids }, uid, status: "sent" },
      {
        $set: {
          status: "pending_approval",
          pendingNotifiedAt: now,
          updatedAt: now,
        },
      }
    );

    await notifications
      .insertMany(
        toPromote.map((d) => ({
          uid,
          type: "appointment.pending_approval",
          title: "Appointment pending approval",
          message: `Your appointment request is pending approval (${getAppointmentMessage({
            doctor: d.doctor,
            date: d.date,
            time: d.time,
            venue: d.venue,
          })}).`,
          createdAt: now,
          readAt: null,
          meta: { appointmentId: String(d._id) },
        })),
        { ordered: false }
      )
      .catch(() => {
        // ignore duplicate/partial failures
      });
  }

  const list = await appointments.find({ uid }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ data: list });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const uid = asString((body as any).uid);
  const patientEmail = asString((body as any).patientEmail).slice(0, 120) || null;
  const patientName = asString((body as any).patientName).slice(0, 80) || null;
  const doctor = asString((body as any).doctor);
  const specialtyInput = asString((body as any).specialty);
  const venueInput = normalizeHospital((body as any).venue);
  const date = asString((body as any).date);
  const time = asString((body as any).time);
  const reason = asString((body as any).reason).slice(0, 240);
  const paymentStatus = asString((body as any).paymentStatus) as PaymentStatus;
  const paymentAmountRaw = Number((body as any).paymentAmount);
  const paymentAmount =
    Number.isFinite(paymentAmountRaw) && paymentAmountRaw > 0
      ? Math.floor(paymentAmountRaw)
      : 200;
  const paymentCurrency = asString((body as any).paymentCurrency).toUpperCase() || "INR";
  const paymentOrderId = asString((body as any).paymentOrderId).slice(0, 120) || null;
  const paymentId = asString((body as any).paymentId).slice(0, 120) || null;
  const paymentSignature = asString((body as any).paymentSignature).slice(0, 256) || null;
  const paymentFailureReason =
    asString((body as any).paymentFailureReason).slice(0, 240) || null;

  if (!uid || !doctor || !date || !time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const db = await getMongoDb();
  const appointments = db.collection("appointments");
  const notifications = db.collection("notifications");
  const doctors = db.collection("doctors");

  const doctorDoc = await doctors.findOne({ name: doctor });
  if (!doctorDoc) {
    return NextResponse.json({ error: "Selected doctor is not available" }, { status: 400 });
  }

  const doctorFields = normalizeFields((doctorDoc as any).fields, (doctorDoc as any).specialty);
  const doctorHospitals = normalizeHospitals((doctorDoc as any).hospitals);
  const specialty = specialtyInput || doctorFields[0];
  const venue = venueInput || doctorHospitals[0];

  if (!specialty || !doctorFields.includes(specialty)) {
    return NextResponse.json({ error: "Invalid doctor field selected" }, { status: 400 });
  }
  if (!venue || !doctorHospitals.includes(venue)) {
    return NextResponse.json({ error: "Invalid hospital selected for this doctor" }, { status: 400 });
  }

  const safePaymentStatus: PaymentStatus = paymentStatus || "not_required";
  if (!allowedPaymentStatuses.has(safePaymentStatus)) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }

  const now = new Date();
  const statusExpiresAt = new Date(now.getTime() + 5000);

  const doc = {
    uid,
    patientEmail,
    patientName,
    doctor,
    specialty,
    venue,
    date,
    time,
    reason: reason || null,
    status: "sent" as AppointmentStatus,
    statusExpiresAt,
    paymentStatus: safePaymentStatus,
    paymentAmount,
    paymentCurrency,
    paymentOrderId,
    paymentId,
    paymentSignature,
    paymentFailureReason,
    createdAt: now,
    updatedAt: now,
  };

  const res = await appointments.insertOne(doc);
  console.info(
    `[appointments] created uid=${uid} doctor=${doctor} venue=${venue} status=sent paymentStatus=${safePaymentStatus}`
  );

  await notifications.insertOne({
    uid,
    type: "appointment.sent",
    title: "Appointment request sent",
    message: `Appointment request sent (${getAppointmentMessage({
      doctor,
      date,
      time,
      venue,
    })}).`,
    createdAt: now,
    readAt: null,
    meta: { appointmentId: String(res.insertedId) },
  });

  return NextResponse.json({ data: { ...doc, _id: res.insertedId } });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const uid = asString(url.searchParams.get("uid"));
  const id = asString(url.searchParams.get("id"));

  if (!uid || !id) {
    return NextResponse.json({ error: "Missing uid or id" }, { status: 400 });
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getMongoDb();
  const appointments = db.collection("appointments");
  const notifications = db.collection("notifications");

  const now = new Date();
  const existing = await appointments.findOne({ _id: objectId, uid });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await appointments.updateOne(
    { _id: objectId, uid },
    { $set: { status: "cancelled", updatedAt: now } }
  );

  await notifications.insertOne({
    uid,
    type: "appointment.cancelled",
    title: "Appointment cancelled",
    message: `Appointment cancelled (${getAppointmentMessage({
      doctor: existing.doctor,
      date: existing.date,
      time: existing.time,
      venue: existing.venue,
    })}).`,
    createdAt: now,
    readAt: null,
    meta: { appointmentId: id },
  });

  return NextResponse.json({ success: true });
}

