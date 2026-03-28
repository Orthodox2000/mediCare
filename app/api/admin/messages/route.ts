import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/app/lib/mongo";
import { getAdminAuth } from "@/app/lib/adminAuth";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: NextRequest) {
  const auth = getAdminAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const title = asString((body as any).title).slice(0, 80);
  const message = asString((body as any).message).slice(0, 400);
  const emails = Array.isArray((body as any).emails) ? (body as any).emails : [];
  const uids = Array.isArray((body as any).uids) ? (body as any).uids : [];
  const sendToAll = Boolean((body as any).sendToAll);

  if (!title || !message) {
    return NextResponse.json({ error: "Missing title or message" }, { status: 400 });
  }
  const emailsValid =
    emails.length &&
    !emails.some((email: any) => typeof email !== "string" || !email.trim() || !email.includes("@"));
  const uidsValid =
    uids.length && !uids.some((u: any) => typeof u !== "string" || !u.trim());

  if (!sendToAll && !emailsValid && !uidsValid) {
    return NextResponse.json({ error: "Select at least one patient email" }, { status: 400 });
  }

  const db = await getMongoDb();
  const notifications = db.collection("notifications");
  const users = db.collection("users");

  let targetUids: string[] = [];
  if (sendToAll) {
    targetUids = await users
      .find({}, { projection: { uid: 1 } })
      .limit(5000)
      .map((u: any) => u.uid as string)
      .toArray();
  } else if (emailsValid) {
    const safeEmails: string[] = (emails as string[]).map((e) =>
      e.trim().toLowerCase()
    );
    const found = await users
      .find({ email: { $in: safeEmails } }, { projection: { uid: 1, email: 1 } })
      .toArray();
    const foundEmails = new Set(found.map((u: any) => String(u.email).toLowerCase()));
    const missing = safeEmails.filter((email: string) => !foundEmails.has(email));
    if (missing.length) {
      return NextResponse.json(
        { error: `Unknown patient email(s): ${missing.slice(0, 3).join(", ")}` },
        { status: 400 }
      );
    }
    targetUids = found.map((u: any) => u.uid as string);
  } else {
    targetUids = uids.map((u: string) => u.trim());
  }

  const now = new Date();
  const docs = targetUids.map((uid) => ({
    uid,
    type: "admin.message",
    title,
    message,
    createdAt: now,
    readAt: null,
    meta: { from: auth.username },
  }));

  if (!docs.length) return NextResponse.json({ success: true, count: 0 });

  await notifications.insertMany(docs, { ordered: false });
  return NextResponse.json({ success: true, count: docs.length });
}
