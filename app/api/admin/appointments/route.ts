import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/app/lib/mongo";
import { getAdminAuth } from "@/app/lib/adminAuth";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

type AppointmentStatus =
  | "sent"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled";

const allowedStatus = new Set<AppointmentStatus>([
  "sent",
  "pending_approval",
  "approved",
  "rejected",
  "cancelled",
]);

export async function GET(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const doctor = asString(url.searchParams.get("doctor"));
  const status = asString(url.searchParams.get("status")) as AppointmentStatus;
  const dateFrom = asString(url.searchParams.get("dateFrom"));
  const dateTo = asString(url.searchParams.get("dateTo"));

  const filter: any = {};
  if (doctor) filter.doctor = doctor;
  if (status && allowedStatus.has(status)) filter.status = status;
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) {
      if (!isIsoDate(dateFrom)) return NextResponse.json({ error: "Invalid dateFrom" }, { status: 400 });
      filter.date.$gte = dateFrom;
    }
    if (dateTo) {
      if (!isIsoDate(dateTo)) return NextResponse.json({ error: "Invalid dateTo" }, { status: 400 });
      filter.date.$lte = dateTo;
    }
  }

  const db = await getMongoDb();
  const appointments = db.collection("appointments");
  const users = db.collection("users");

  const list = await appointments
    .find(filter)
    .sort({ date: 1, doctor: 1, time: 1, createdAt: -1 })
    .limit(200)
    .toArray();

  const uids = Array.from(
    new Set(list.map((a: any) => a.uid).filter((u: any) => typeof u === "string" && u))
  );
  const userDocs = uids.length
    ? await users
        .find({ uid: { $in: uids } }, { projection: { uid: 1, email: 1, name: 1 } })
        .toArray()
    : [];
  const byUid = new Map<string, { email: string | null; name?: string }>(
    userDocs.map((u: any) => [
      u.uid,
      { email: (typeof u.email === "string" ? u.email : null) as any, name: u.name },
    ])
  );

  const enriched = list.map((a: any) => {
    const u = byUid.get(a.uid);
    return {
      ...a,
      patientEmail: a.patientEmail ?? u?.email ?? null,
      patientName: a.patientName ?? u?.name ?? null,
    };
  });

  return NextResponse.json({ data: enriched });
}

export async function PATCH(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const id = asString((body as any).id);
  const status = asString((body as any).status) as AppointmentStatus;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!allowedStatus.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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

  const appt = await appointments.findOne({ _id: objectId });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  await appointments.updateOne(
    { _id: objectId },
    { $set: { status, updatedAt: now } }
  );

  if (appt.uid) {
    const title =
      status === "approved"
        ? "Appointment approved"
        : status === "rejected"
          ? "Appointment rejected"
          : "Appointment updated";
    const message = `Your appointment (${appt.doctor} • ${appt.date} • ${appt.time}) is now: ${status.replace(/_/g, " ")}.`;

    await notifications.insertOne({
      uid: appt.uid,
      type: `appointment.${status}`,
      title,
      message,
      createdAt: now,
      readAt: null,
      meta: { appointmentId: id },
    });
  }

  const updated = await appointments.findOne({ _id: objectId });
  return NextResponse.json({ data: updated });
}
