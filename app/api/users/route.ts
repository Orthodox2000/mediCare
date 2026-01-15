import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { uid, name, email, phone, provider, photo, createdAt } = data;

    if (!uid || !name || !provider || !createdAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await client.connect();
    const db = client.db("medicare");
    const collection = db.collection("users");
    
    // Upsert user by UID
    await collection.updateOne(
      { uid },
      { $set: { uid, name, email, phone, provider, photo, createdAt } },
      { upsert: true }
    );  
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("MongoDB API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await client.close();
  }
}
