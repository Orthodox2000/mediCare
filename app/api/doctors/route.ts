import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/app/lib/mongo";
import { getAdminAuth } from "@/app/lib/adminAuth";
import {
  HOSPITAL_OPTIONS,
  normalizeFields,
  normalizeHospitals,
} from "@/app/lib/appointmentConfig";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const normalizeDoctorName = (name: string) => name.trim().toLowerCase();
const parseExperienceYears = (experience: string | null | undefined) => {
  const match = (experience || "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

type DoctorDoc = {
  _id?: ObjectId;
  name: string;
  fields: string[];
  hospitals: string[];
  specialty: string;
  experience?: string | null;
  rating?: number | null;
  patients?: number | null;
  imageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET() {
  const db = await getMongoDb();
  const doctors = db.collection<DoctorDoc>("doctors");
  const list = await doctors.find({}).toArray();

  const normalized = list
    .map((doc) => {
      const fields = normalizeFields((doc as any).fields, doc.specialty);
      const hospitals = normalizeHospitals((doc as any).hospitals);
      return {
        ...doc,
        fields,
        hospitals,
        specialty: fields[0] || doc.specialty || "",
      };
    })
    .sort((a, b) => {
      const aSupriya = normalizeDoctorName(a.name) === "dr. supriya khandekar";
      const bSupriya = normalizeDoctorName(b.name) === "dr. supriya khandekar";
      if (aSupriya && !bSupriya) return -1;
      if (!aSupriya && bSupriya) return 1;

      const fieldDiff = (b.fields?.length || 0) - (a.fields?.length || 0);
      if (fieldDiff !== 0) return fieldDiff;

      const expDiff = parseExperienceYears(b.experience) - parseExperienceYears(a.experience);
      if (expDiff !== 0) return expDiff;

      const patientsDiff = (b.patients || 0) - (a.patients || 0);
      if (patientsDiff !== 0) return patientsDiff;

      return a.name.localeCompare(b.name);
    });

  return NextResponse.json({
    data: normalized,
    meta: { hospitals: Array.from(HOSPITAL_OPTIONS) },
  });
}

export async function POST(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = asString((body as any).name).slice(0, 80);
  const rawSpecialty = asString((body as any).specialty).slice(0, 80);
  const fields = normalizeFields((body as any).fields, rawSpecialty);
  const hospitals = normalizeHospitals((body as any).hospitals);
  const specialty = fields[0] || rawSpecialty;
  const experience = asString((body as any).experience).slice(0, 40) || null;
  const imageUrl = asString((body as any).imageUrl).slice(0, 512) || null;

  const ratingRaw = (body as any).rating;
  const patientsRaw = (body as any).patients;

  const rating =
    typeof ratingRaw === "number" && ratingRaw >= 0 && ratingRaw <= 5
      ? ratingRaw
      : null;
  const patients =
    typeof patientsRaw === "number" && patientsRaw >= 0
      ? Math.floor(patientsRaw)
      : null;

  if (!name || !fields.length || !hospitals.length) {
    return NextResponse.json(
      { error: "Missing doctor name, fields, or hospitals" },
      { status: 400 }
    );
  }

  const db = await getMongoDb();
  const doctors = db.collection<DoctorDoc>("doctors");

  const now = new Date();
  const doc: DoctorDoc = {
    name,
    fields,
    hospitals,
    specialty,
    experience,
    rating,
    patients,
    imageUrl,
    createdAt: now,
    updatedAt: now,
  };
  const res = await doctors.insertOne(doc);
  console.info(
    `[doctors] created doctor=${name} fields=${fields.join("|")} hospitals=${hospitals.join("|")}`
  );
  return NextResponse.json({ data: { ...doc, _id: res.insertedId } });
}

export async function PATCH(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const id = asString((body as any).id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const update: any = { updatedAt: new Date() };
  if (typeof (body as any).name === "string") update.name = asString((body as any).name).slice(0, 80);
  const specialtyInput =
    typeof (body as any).specialty === "string"
      ? asString((body as any).specialty).slice(0, 80)
      : "";
  if ("fields" in (body as any) || specialtyInput) {
    const fields = normalizeFields((body as any).fields, specialtyInput);
    if (fields.length) {
      update.fields = fields;
      update.specialty = fields[0];
    }
  }
  if ("hospitals" in (body as any)) {
    const hospitals = normalizeHospitals((body as any).hospitals);
    if (hospitals.length) update.hospitals = hospitals;
  }
  if (typeof (body as any).experience === "string") update.experience = asString((body as any).experience).slice(0, 40) || null;
  if (typeof (body as any).imageUrl === "string") update.imageUrl = asString((body as any).imageUrl).slice(0, 512) || null;
  if (typeof (body as any).rating === "number") {
    const r = (body as any).rating;
    update.rating = r >= 0 && r <= 5 ? r : null;
  }
  if (typeof (body as any).patients === "number") {
    const p = (body as any).patients;
    update.patients = p >= 0 ? Math.floor(p) : null;
  }

  const db = await getMongoDb();
  const doctors = db.collection<DoctorDoc>("doctors");
  await doctors.updateOne({ _id: objectId }, { $set: update });
  const updated = await doctors.findOne({ _id: objectId });
  if (updated) {
    const fields = normalizeFields((updated as any).fields, updated.specialty);
    const hospitals = normalizeHospitals((updated as any).hospitals);
    console.info(
      `[doctors] updated doctor=${updated.name} fields=${fields.join("|")} hospitals=${hospitals.join("|")}`
    );
    return NextResponse.json({
      data: { ...updated, fields, hospitals, specialty: fields[0] || updated.specialty || "" },
    });
  }
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = asString(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getMongoDb();
  const doctors = db.collection<DoctorDoc>("doctors");
  const existing = await doctors.findOne({ _id: objectId }, { projection: { name: 1 } });
  await doctors.deleteOne({ _id: objectId });
  console.info(`[doctors] deleted doctor=${existing?.name || id}`);
  return NextResponse.json({ success: true });
}
