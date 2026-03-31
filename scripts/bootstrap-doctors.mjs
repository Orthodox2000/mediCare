import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const sampleDoctors = [
  {
    name: "Dr. Supriya Khandekar",
    fields: [
      "Cardiology",
      "Interventional Cardiology",
      "Preventive Cardiology",
      "General Medicine",
    ],
    hospitals: ["SWACS Hospital", "MetroCare Hospital"],
    experience: "24 years",
    rating: 5,
    patients: 6400,
    imageUrl: "/spk.png",
  },
  {
    name: "Dr. Piyush Raut",
    fields: ["Neurology", "Neurophysiology"],
    hospitals: ["SWACS Hospital", "City General Hospital"],
    experience: "12 years",
    rating: 4.8,
    patients: 2100,
  },
  {
    name: "Dr. Poonam Shinde",
    fields: ["Pediatrics", "Neonatology"],
    hospitals: ["Sunrise Medical Center", "SWACS Hospital"],
    experience: "10 years",
    rating: 4.8,
    patients: 3200,
  },
  {
    name: "Dr. Prashant Shinde",
    fields: ["Orthopedics", "Sports Injury"],
    hospitals: ["Lifeline Multispecialty Hospital", "City General Hospital"],
    experience: "18 years",
    rating: 4.7,
    patients: 1800,
  },
  {
    name: "Dr. Diksha Patil",
    fields: ["Dermatology", "Cosmetology"],
    hospitals: ["MetroCare Hospital", "Sunrise Medical Center"],
    experience: "14 years",
    rating: 4.8,
    patients: 2400,
  },
  {
    name: "Dr. Atharva More",
    fields: ["General Medicine", "Diabetology"],
    hospitals: ["SWACS Hospital", "MetroCare Hospital"],
    experience: "5 years",
    rating: 4.6,
    patients: 980,
  },
  {
    name: "Dr. Neha Sharma",
    fields: ["Gynecology", "Obstetrics"],
    hospitals: ["City General Hospital", "MetroCare Hospital"],
    experience: "13 years",
    rating: 4.8,
    patients: 2900,
  },
  {
    name: "Dr. Rohan Kulkarni",
    fields: ["ENT", "Head and Neck Surgery"],
    hospitals: ["Sunrise Medical Center", "SWACS Hospital"],
    experience: "12 years",
    rating: 4.8,
    patients: 2100,
  },
  {
    name: "Dr. Aditi Iyer",
    fields: ["Pulmonology", "Critical Care"],
    hospitals: ["Lifeline Multispecialty Hospital", "City General Hospital"],
    experience: "11 years",
    rating: 4.7,
    patients: 2300,
  },
  {
    name: "Dr. Vivek Menon",
    fields: ["Psychiatry", "De-Addiction Medicine"],
    hospitals: ["SWACS Hospital", "Lifeline Multispecialty Hospital"],
    experience: "16 years",
    rating: 4.9,
    patients: 1900,
  },
];

const deprecatedDoctorNames = [
  "dr. ankit mali",
  "dr. sarah johnson",
  "dr. michael chen",
  "dr. emily davis",
];

const getEnvFromFile = (key) => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return "";
  const source = fs.readFileSync(envPath, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const envKey = trimmed.slice(0, idx).trim();
    if (envKey !== key) continue;
    const raw = trimmed.slice(idx + 1).trim();
    if (!raw) return "";
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      return raw.slice(1, -1);
    }
    return raw;
  }
  return "";
};

const normalizeName = (value) => String(value || "").trim().toLowerCase();
const normalizeList = (value, fallback = []) => {
  const source = Array.isArray(value) ? value : [];
  const unique = new Set();
  for (const item of source) {
    const normalized = String(item || "").trim();
    if (normalized) unique.add(normalized);
  }
  if (!unique.size) {
    for (const item of fallback) unique.add(item);
  }
  return Array.from(unique);
};

const uri = process.env.MONGODB_URI || getEnvFromFile("MONGODB_URI");
if (!uri) {
  console.error("MONGODB_URI missing in environment and .env");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db("medicare");
  const doctors = db.collection("doctors");
  await doctors.deleteMany({
    $expr: {
      $in: [{ $toLower: { $trim: { input: "$name" } } }, deprecatedDoctorNames],
    },
  });

  const existing = await doctors.find({}, { projection: { _id: 1, name: 1 } }).toArray();
  const existingByNormalizedName = new Map(
    existing.map((item) => [normalizeName(item.name), item._id])
  );

  const now = new Date();
  let inserted = 0;
  let updated = 0;

  for (const doctor of sampleDoctors) {
    const name = String(doctor.name || "").trim();
    const fields = normalizeList(doctor.fields, ["General Medicine"]);
    const hospitals = normalizeList(doctor.hospitals, ["SWACS Hospital"]);

    const payload = {
      name,
      fields,
      hospitals,
      specialty: fields[0] || "General Medicine",
      experience: doctor.experience || null,
      rating: typeof doctor.rating === "number" ? doctor.rating : null,
      patients: typeof doctor.patients === "number" ? Math.floor(doctor.patients) : null,
      imageUrl: doctor.imageUrl || null,
      updatedAt: now,
    };

    const existingId = existingByNormalizedName.get(normalizeName(name));
    if (existingId) {
      await doctors.updateOne({ _id: existingId }, { $set: payload });
      updated += 1;
      continue;
    }

    await doctors.insertOne({ ...payload, createdAt: now });
    inserted += 1;
  }

  const total = await doctors.countDocuments();
  console.log(
    JSON.stringify(
      { ok: true, inserted, updated, seeded: sampleDoctors.length, total },
      null,
      2
    )
  );
} catch (error) {
  console.error("Bootstrap failed:", error);
  process.exitCode = 1;
} finally {
  await client.close();
}
