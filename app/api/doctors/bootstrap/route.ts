import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/app/lib/mongo";
import { getAdminAuth } from "@/app/lib/adminAuth";
import { normalizeFields, normalizeHospitals } from "@/app/lib/appointmentConfig";
import { SAMPLE_DOCTORS } from "@/app/lib/sampleDoctors";

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

const normalizeDoctorName = (value: string) => value.trim().toLowerCase();
const DEPRECATED_DOCTOR_NAMES = [
  "dr. ankit mali",
  "dr. sarah johnson",
  "dr. michael chen",
  "dr. emily davis",
];

export async function POST(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getMongoDb();
  const doctors = db.collection<DoctorDoc>("doctors");
  await doctors.deleteMany({
    $expr: {
      $in: [{ $toLower: { $trim: { input: "$name" } } }, DEPRECATED_DOCTOR_NAMES],
    },
  });
  const existingDoctors = await doctors
    .find({}, { projection: { _id: 1, name: 1 } })
    .toArray();

  const existingByName = new Map<string, ObjectId>();
  for (const doctor of existingDoctors) {
    if (!doctor._id || !doctor.name) continue;
    existingByName.set(normalizeDoctorName(doctor.name), doctor._id);
  }

  const now = new Date();
  let inserted = 0;
  let updated = 0;

  for (const sample of SAMPLE_DOCTORS) {
    const fields = normalizeFields(sample.fields);
    const hospitals = normalizeHospitals(sample.hospitals);
    const specialty = fields[0] || "General Medicine";
    const normalizedName = normalizeDoctorName(sample.name);

    const baseDoc = {
      name: sample.name.trim(),
      fields,
      hospitals,
      specialty,
      experience: sample.experience || null,
      rating: sample.rating ?? null,
      patients: sample.patients ?? null,
      imageUrl: sample.imageUrl || null,
      updatedAt: now,
    };

    const existingId = existingByName.get(normalizedName);
    if (existingId) {
      await doctors.updateOne({ _id: existingId }, { $set: baseDoc });
      updated += 1;
      continue;
    }

    await doctors.insertOne({
      ...baseDoc,
      createdAt: now,
    });
    inserted += 1;
  }

  const total = await doctors.countDocuments();
  console.info(
    `[doctors] bootstrap completed inserted=${inserted} updated=${updated} total=${total}`
  );

  return NextResponse.json({
    data: {
      inserted,
      updated,
      seeded: SAMPLE_DOCTORS.length,
      total,
    },
    message: "Sample doctors bootstrapped successfully.",
  });
}
