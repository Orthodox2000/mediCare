import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/app/lib/mongo";
import { getAdminAuth } from "@/app/lib/adminAuth";
import {
  HOSPITAL_OPTIONS,
  isIsoDate,
  normalizeHospitals,
  normalizeHospital,
} from "@/app/lib/appointmentConfig";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const normalizeDoctorName = (value: unknown) =>
  (typeof value === "string" ? value.trim().toLowerCase() : "");

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

const getAppointmentMessage = (data: {
  doctor: string;
  date: string;
  time: string;
  venue?: string | null;
}) => `${data.doctor} | ${data.date} | ${data.time} | Venue: ${data.venue || "TBD"}`;

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
    // True FCFS ordering for admin queue: oldest request first.
    .sort({ createdAt: 1, _id: 1 })
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
  const statusInput = asString((body as any).status);
  const venueInput = normalizeHospital((body as any).venue);
  const hasStatusUpdate = Boolean(statusInput);
  const hasVenueUpdate = Boolean((body as any).venue);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!hasStatusUpdate && !hasVenueUpdate) {
    return NextResponse.json(
      { error: "At least one of status or venue is required" },
      { status: 400 }
    );
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
  const doctors = db.collection("doctors");

  const appt = await appointments.findOne({ _id: objectId });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: any = { updatedAt: new Date() };
  const now = update.updatedAt as Date;

  if (hasStatusUpdate) {
    const status = statusInput as AppointmentStatus;
    if (!allowedStatus.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = status;
  }

  if (hasVenueUpdate) {
    if (!venueInput) {
      return NextResponse.json({ error: "Invalid venue selected" }, { status: 400 });
    }

    const doctorName = asString((appt as any).doctor);
    const normalizedDoctorName = normalizeDoctorName(doctorName);

    let doctorDoc = doctorName ? await doctors.findOne({ name: doctorName }) : null;
    if (!doctorDoc && normalizedDoctorName) {
      doctorDoc = await doctors.findOne({
        $expr: {
          $eq: [{ $toLower: { $trim: { input: "$name" } } }, normalizedDoctorName],
        },
      });
    }

    if (doctorDoc) {
      const doctorHospitals = normalizeHospitals((doctorDoc as any).hospitals);
      if (!doctorHospitals.includes(venueInput)) {
        return NextResponse.json(
          { error: "Selected venue is not available for this doctor" },
          { status: 400 }
        );
      }
    } else if (!Array.from(HOSPITAL_OPTIONS).includes(venueInput)) {
      return NextResponse.json(
        { error: "Selected venue is invalid" },
        { status: 400 }
      );
    }

    if (!doctorDoc) {
      console.warn(
        `[admin.appointments] doctor lookup failed for appointment=${id}; allowing venue update using global hospital options`
      );
    }

    update.venue = venueInput;
  }

  await appointments.updateOne({ _id: objectId }, { $set: update });

  const updated = await appointments.findOne({ _id: objectId });
  if (updated?.uid) {
    const nextStatus = (update.status || appt.status || "pending_approval") as string;
    const venueForMessage = update.venue || updated.venue || appt.venue || null;
    const title =
      update.status === "approved"
        ? "Appointment confirmed"
        : update.status === "rejected"
          ? "Appointment rejected"
          : hasVenueUpdate && !hasStatusUpdate
            ? "Appointment venue updated"
            : "Appointment updated";
    const message =
      update.status === "approved"
        ? `Your appointment is confirmed (${getAppointmentMessage({
            doctor: appt.doctor,
            date: appt.date,
            time: appt.time,
            venue: venueForMessage,
          })}).`
        : `Your appointment update: ${nextStatus.replace(/_/g, " ")} (${getAppointmentMessage({
            doctor: appt.doctor,
            date: appt.date,
            time: appt.time,
            venue: venueForMessage,
          })}).`;

    await notifications.insertOne({
      uid: updated.uid,
      type: `appointment.${update.status || "updated"}`,
      title,
      message,
      createdAt: now,
      readAt: null,
      meta: { appointmentId: id },
    });
  }

  console.info(
    `[admin.appointments] updated id=${id} status=${update.status || appt.status} venue=${update.venue || appt.venue || "TBD"}`
  );

  return NextResponse.json({ data: updated });
}
