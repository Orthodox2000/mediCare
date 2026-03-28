import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/app/lib/mongo";
import {
  getAdminAuth,
  hashPassword,
  verifyPassword,
  type AdminSettingsDoc,
} from "@/app/lib/adminAuth";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function GET(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getMongoDb();
  const settings = db.collection<AdminSettingsDoc>("adminSettings");
  const doc = await settings.findOne({ _id: "singleton" });
  if (!doc) return NextResponse.json({ error: "Missing settings" }, { status: 404 });

  return NextResponse.json({ username: doc.username, updatedAt: doc.updatedAt });
}

export async function PATCH(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const currentPassword = asString((body as any).currentPassword);
  const newUsername = asString((body as any).newUsername);
  const newPassword = asString((body as any).newPassword);

  if (!currentPassword) {
    return NextResponse.json({ error: "Missing currentPassword" }, { status: 400 });
  }
  if (!newUsername && !newPassword) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = await getMongoDb();
  const settings = db.collection<AdminSettingsDoc>("adminSettings");
  const doc = await settings.findOne({ _id: "singleton" });
  if (!doc) return NextResponse.json({ error: "Missing settings" }, { status: 404 });

  if (!verifyPassword(currentPassword, doc)) {
    return NextResponse.json({ error: "Invalid current password" }, { status: 401 });
  }

  const update: Partial<AdminSettingsDoc> = { updatedAt: new Date() };
  if (newUsername) update.username = newUsername.slice(0, 40);
  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const hashed = hashPassword(newPassword);
    update.passwordHash = hashed.passwordHash;
    update.salt = hashed.salt;
    update.iterations = hashed.iterations;
  }

  await settings.updateOne({ _id: "singleton" }, { $set: update });
  return NextResponse.json({ success: true });
}

