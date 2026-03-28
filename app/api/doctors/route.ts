import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/app/lib/mongo";
import { getAdminAuth } from "@/app/lib/adminAuth";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

type DoctorDoc = {
  _id?: ObjectId;
  name: string;
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
  const list = await doctors.find({}).sort({ name: 1 }).toArray();
  return NextResponse.json({ data: list });
}

export async function POST(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = asString((body as any).name).slice(0, 80);
  const specialty = asString((body as any).specialty).slice(0, 80);
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

  if (!name || !specialty) {
    return NextResponse.json({ error: "Missing name or specialty" }, { status: 400 });
  }

  const db = await getMongoDb();
  const doctors = db.collection<DoctorDoc>("doctors");

  const now = new Date();
  const doc: DoctorDoc = {
    name,
    specialty,
    experience,
    rating,
    patients,
    imageUrl,
    createdAt: now,
    updatedAt: now,
  };
  const res = await doctors.insertOne(doc);
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
  if (typeof (body as any).specialty === "string") update.specialty = asString((body as any).specialty).slice(0, 80);
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
  await doctors.deleteOne({ _id: objectId });
  return NextResponse.json({ success: true });
}

