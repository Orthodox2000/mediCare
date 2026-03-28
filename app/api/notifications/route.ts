import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/app/lib/mongo";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const uid = asString(url.searchParams.get("uid"));
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  const db = await getMongoDb();
  const notifications = db.collection("notifications");

  const list = await notifications
    .find({ uid })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return NextResponse.json({ data: list });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const uid = asString((body as any).uid);
  const id = asString((body as any).id);
  const action = asString((body as any).action);
  if (!uid || !id || action !== "mark_read") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getMongoDb();
  const notifications = db.collection("notifications");
  await notifications.updateOne(
    { _id: objectId, uid },
    { $set: { readAt: new Date() } }
  );

  return NextResponse.json({ success: true });
}

