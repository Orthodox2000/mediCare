import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/app/lib/mongo";
import { getAdminAuth } from "@/app/lib/adminAuth";
import { isValidE164, isValidEmail, normalizeEmail, normalizeName } from "@/app/lib/validation";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function GET(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = asString(url.searchParams.get("q")).toLowerCase();

  const db = await getMongoDb();
  const users = db.collection("users");

  const filter: any = {};
  if (q) {
    filter.$or = [
      { uid: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
    ];
  }

  const list = await users
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return NextResponse.json({ data: list });
}

export async function PATCH(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const uid = asString((body as any).uid);
  const targetEmailRaw = asString((body as any).targetEmail);
  const targetEmail = targetEmailRaw ? normalizeEmail(targetEmailRaw) : "";
  if (!uid && !targetEmail) {
    return NextResponse.json({ error: "Missing uid or targetEmail" }, { status: 400 });
  }
  if (targetEmail && !isValidEmail(targetEmail)) {
    return NextResponse.json({ error: "Invalid targetEmail" }, { status: 400 });
  }

  const update: any = {};
  if (typeof (body as any).name === "string") {
    const safe = normalizeName((body as any).name);
    if (!safe) return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    update.name = safe;
  }
  if (typeof (body as any).email === "string") {
    const safe = normalizeEmail((body as any).email);
    if (safe && !isValidEmail(safe)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    update.email = safe || null;
  }
  if (typeof (body as any).phone === "string") {
    const safe = asString((body as any).phone).replace(/\s+/g, "");
    if (safe && !isValidE164(safe)) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
    update.phone = safe || null;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = await getMongoDb();
  const users = db.collection("users");
  const filter = uid ? { uid } : { email: targetEmail };
  await users.updateOne(filter, { $set: update });
  const updated = await users.findOne(filter);
  return NextResponse.json({ data: updated });
}
