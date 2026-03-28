import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/app/lib/mongo";
import {
  isValidE164,
  isValidEmail,
  normalizeEmail,
  normalizeName,
} from "@/app/lib/validation";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const withOptionsHeaders = (res: NextResponse) => {
  res.headers.set("Allow", "GET,POST,OPTIONS");
  return res;
};

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Allow", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const existsMode = url.searchParams.get("exists") === "1";

  const emailParam = asString(url.searchParams.get("email"));
  const uidParam = asString(url.searchParams.get("uid"));
  const phoneParam = asString(url.searchParams.get("phone")).replace(/\s+/g, "");

  if (existsMode) {
    if (!emailParam) {
      return withOptionsHeaders(
        NextResponse.json({ error: "Missing email" }, { status: 400 })
      );
    }
    const email = normalizeEmail(emailParam);
    if (!isValidEmail(email)) {
      return withOptionsHeaders(
        NextResponse.json({ error: "Invalid email" }, { status: 400 })
      );
    }

    try {
      const db = await getMongoDb("medicare");
      const collection = db.collection("users");
      const existing = await collection.findOne(
        { email },
        { projection: { _id: 1 } }
      );
      return withOptionsHeaders(
        NextResponse.json({ exists: Boolean(existing) })
      );
    } catch (err: any) {
      console.error("MongoDB API error:", err);
      return withOptionsHeaders(
        NextResponse.json({ error: err?.message || "Server error" }, { status: 500 })
      );
    }
  }

  // Profile fetch mode (return user object)
  if (!uidParam && !emailParam) {
    return withOptionsHeaders(
      NextResponse.json({ error: "Missing uid or email" }, { status: 400 })
    );
  }

  const email = emailParam ? normalizeEmail(emailParam) : "";
  if (emailParam && !isValidEmail(email)) {
    return withOptionsHeaders(
      NextResponse.json({ error: "Invalid email" }, { status: 400 })
    );
  }
  if (phoneParam && !isValidE164(phoneParam)) {
    return withOptionsHeaders(
      NextResponse.json({ error: "Invalid phone" }, { status: 400 })
    );
  }

  try {
    const db = await getMongoDb("medicare");
    const collection = db.collection("users");

    const filter = uidParam ? { uid: uidParam } : { email };
    const user = await collection.findOne(filter, {
      projection: { _id: 0 }, // never expose internal IDs
    });

    const exists = Boolean(user);

    // If phone is missing in DB, allow setting it once (when provided) and return updated object
    if (user && !user.phone && phoneParam) {
      await collection.updateOne(filter, { $set: { phone: phoneParam } });
      user.phone = phoneParam;
    }

    // There is no password stored in Mongo; return the user document as-is
    // Always include `exists` for compatibility with older clients.
    return withOptionsHeaders(NextResponse.json({ exists, data: user || null }));
  } catch (err: any) {
    console.error("MongoDB API error:", err);
    return withOptionsHeaders(
      NextResponse.json({ error: err?.message || "Server error" }, { status: 500 })
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { uid, name, email, phone, provider, photo, createdAt } = data;

    const allowedProviders = new Set(["password", "google", "phone"]);

    if (typeof uid !== "string" || !uid.trim()) {
      return NextResponse.json({ error: "Invalid uid" }, { status: 400 });
    }
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (typeof provider !== "string" || !allowedProviders.has(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) {
      return NextResponse.json({ error: "Invalid createdAt" }, { status: 400 });
    }

    const safeUid = uid.trim().slice(0, 128);
    const safeName = normalizeName(name);

    const safeEmail =
      email == null
        ? null
        : typeof email === "string" && email.trim()
          ? normalizeEmail(email)
          : null;
    if (safeEmail && !isValidEmail(safeEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const safePhone =
      phone == null
        ? null
        : typeof phone === "string" && phone.trim()
          ? phone.trim().replace(/\\s+/g, "")
          : null;
    if (safePhone && !isValidE164(safePhone)) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const safePhoto =
      photo == null
        ? null
        : typeof photo === "string" && photo.trim()
          ? photo.trim().slice(0, 512)
          : null;

    const db = await getMongoDb("medicare");
    const collection = db.collection("users");
    
    // Upsert user by UID
    await collection.updateOne(
      { uid: safeUid },
      {
        $set: {
          uid: safeUid,
          name: safeName,
          email: safeEmail,
          phone: safePhone,
          provider,
          photo: safePhoto,
          createdAt,
        },
      },
      { upsert: true }
    );  
    return withOptionsHeaders(NextResponse.json({ success: true }));
  } catch (err: any) {
    console.error("MongoDB API error:", err);
    return withOptionsHeaders(
      NextResponse.json({ error: err.message }, { status: 500 })
    );
  }
}
