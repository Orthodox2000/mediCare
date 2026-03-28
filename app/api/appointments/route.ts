import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/app/lib/mongo";

type AppointmentStatus = "sent" | "pending_approval" | "approved" | "rejected" | "cancelled";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const uid = asString(url.searchParams.get("uid"));
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  const db = await getMongoDb();
  const appointments = db.collection("appointments");
  const notifications = db.collection("notifications");

  const now = new Date();

  // Promote any "sent" appointments older than 5 seconds to "pending_approval"
  const toPromote = await appointments
    .find({
      uid,
      status: "sent",
      statusExpiresAt: { $lte: now },
      pendingNotifiedAt: { $exists: false },
    })
    .project({ _id: 1, doctor: 1, date: 1, time: 1 })
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

    await notifications.insertMany(
      toPromote.map((d) => ({
        uid,
        type: "appointment.pending_approval",
        title: "Appointment pending approval",
        message: `Your appointment request is pending approval (${d.doctor} • ${d.date} • ${d.time}).`,
        createdAt: now,
        readAt: null,
        meta: { appointmentId: String(d._id) },
      })),
      { ordered: false }
    ).catch(() => {
      // ignore duplicate/partial failures
    });
  }

  const list = await appointments
    .find({ uid })
    .sort({ createdAt: -1 })
    .toArray();

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
  const specialty = asString((body as any).specialty);
  const date = asString((body as any).date);
  const time = asString((body as any).time);
  const reason = asString((body as any).reason).slice(0, 240);

  if (!uid || !doctor || !specialty || !date || !time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const db = await getMongoDb();
  const appointments = db.collection("appointments");
  const notifications = db.collection("notifications");

  const now = new Date();
  const statusExpiresAt = new Date(now.getTime() + 5000);

  const doc = {
    uid,
    patientEmail,
    patientName,
    doctor,
    specialty,
    date,
    time,
    reason: reason || null,
    status: "sent" as AppointmentStatus,
    statusExpiresAt,
    createdAt: now,
    updatedAt: now,
  };

  const res = await appointments.insertOne(doc);

  await notifications.insertOne({
    uid,
    type: "appointment.sent",
    title: "Appointment request sent",
    message: `Appointment request sent (${doctor} • ${date} • ${time}).`,
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
    message: `Appointment cancelled (${existing.doctor} • ${existing.date} • ${existing.time}).`,
    createdAt: now,
    readAt: null,
    meta: { appointmentId: id },
  });

  return NextResponse.json({ success: true });
}
