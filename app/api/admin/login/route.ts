import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/app/lib/mongo";
import {
  getDefaultAdminCredentials,
  hashPassword,
  signAdminToken,
  verifyPassword,
  type AdminSettingsDoc,
} from "@/app/lib/adminAuth";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const username = asString((body as any).username);
  const password = asString((body as any).password);
  if (!username || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const db = await getMongoDb();
  const settings = db.collection<AdminSettingsDoc>("adminSettings");

  let doc = await settings.findOne({ _id: "singleton" });
  if (!doc) {
    const defaults = getDefaultAdminCredentials();
    const hashed = hashPassword(defaults.password);
    doc = {
      _id: "singleton",
      username: defaults.username,
      passwordHash: hashed.passwordHash,
      salt: hashed.salt,
      iterations: hashed.iterations,
      updatedAt: new Date(),
    };
    await settings.insertOne(doc);
  }

  if (username !== doc.username || !verifyPassword(password, doc)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signAdminToken(doc.username);
  return NextResponse.json({
    token,
    expiresInSeconds: 3600,
  });
}

