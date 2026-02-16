import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = "medicare"; // change if needed
const COLLECTION = "healthData";

let client: MongoClient;

async function getClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

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

    if (!userId || !date) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(DB_NAME);

    await db.collection(COLLECTION).insertOne({
      userId,
      date, // STRING DATE
      heartRate,
      bloodPressure,
      weight,
      sugar,
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
export async function GET(req: Request,res: Response) {
    
  try { 
     const url = new URL(req.url || "");
    const userId = url.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 }
      );
    }

    const client = await getClient();
    const db = client.db(DB_NAME);

    const data = await db
      .collection(COLLECTION)
      .find({ userId })
      .sort({ date: -1 }) // newest first
      .limit(7)
      .toArray();

    // Reverse so chart shows oldest → newest
    const formatted = data.reverse().map((d) => ({
      day: d.date, // frontend still uses "day" key
      heartRate: d.heartRate,
      bloodPressure: d.bloodPressure,
      weight: d.weight,
      sugar: d.sugar,
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
