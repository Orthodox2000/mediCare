import { NextResponse } from "next/server";
import { getMongoDb } from "@/app/lib/mongo";

const DB_NAME = "medicare";
const COLLECTION = "healthData";

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const asNumber = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/* =========================
   POST → ADD HEALTH DATA
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      userId,
      date,
      heartRate,
      bloodPressure,
      weight,
      sugar,
    } = body;

    const safeUserId = asString(userId).slice(0, 120);
    const safeDate = asString(date);

    if (!safeUserId || !safeDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!isIsoDate(safeDate)) {
      return NextResponse.json(
        { success: false, error: "Invalid date" },
        { status: 400 }
      );
    }

    const hr = asNumber(heartRate);
    const bp = asNumber(bloodPressure);
    const wt = asNumber(weight);
    const su = asNumber(sugar);

    if (hr == null && bp == null && wt == null && su == null) {
      return NextResponse.json(
        { success: false, error: "At least one metric is required" },
        { status: 400 }
      );
    }

    const db = await getMongoDb(DB_NAME);

    await db.collection(COLLECTION).insertOne({
      userId: safeUserId,
      date: safeDate,
      heartRate: hr,
      bloodPressure: bp,
      weight: wt,
      sugar: su,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Health data saved",
    });
  } catch (err) {
    console.error("POST /health/add error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

/* =========================
   GET → LAST 7 DATA POINTS
========================= */
export async function GET(req: Request) {
    
  try { 
     const url = new URL(req.url || "");
    const userId = url.searchParams.get("userId");
    const safeUserId = asString(userId).slice(0, 120);
    
    if (!safeUserId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 }
      );
    }

    const db = await getMongoDb(DB_NAME);

    const data = await db
      .collection(COLLECTION)
      .find({ userId: safeUserId })
      .sort({ date: -1 }) // newest first
      .limit(30)
      .toArray();

    // Reverse so chart shows oldest → newest
    const formatted = data.reverse().map((d) => ({
      day: d.date, // frontend still uses "day" key
      heartRate: typeof d.heartRate === "number" ? d.heartRate : null,
      bloodPressure: typeof d.bloodPressure === "number" ? d.bloodPressure : null,
      weight: typeof d.weight === "number" ? d.weight : null,
      sugar: typeof d.sugar === "number" ? d.sugar : null,
    }));

    return NextResponse.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    console.error("GET /health/add error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
