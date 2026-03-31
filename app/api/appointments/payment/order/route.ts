import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/app/lib/mongo";
import {
  APPOINTMENT_AMOUNT_PAISE,
  APPOINTMENT_AMOUNT_RUPEES,
  isIsoDate,
  normalizeFields,
  normalizeHospital,
  normalizeHospitals,
} from "@/app/lib/appointmentConfig";

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const uid = asString((body as any).uid);
  const patientEmail = asString((body as any).patientEmail).slice(0, 120) || null;
  const patientName = asString((body as any).patientName).slice(0, 80) || null;
  const doctor = asString((body as any).doctor);
  const specialtyInput = asString((body as any).specialty).slice(0, 80);
  const venueInput = normalizeHospital((body as any).venue);
  const date = asString((body as any).date);
  const time = asString((body as any).time);
  const reason = asString((body as any).reason).slice(0, 240) || null;

  if (!uid || !doctor || !date || !time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const keyId = asString(process.env.RAZORPAY_KEY_ID);
  const keySecret = asString(process.env.RAZORPAY_KEY_SECRET);
  const razorpayOrderUrl =
    asString(process.env.RAZORPAY_ORDER_URL) || "https://api.razorpay.com/v1/orders";
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay keys are not configured on the server" },
      { status: 500 }
    );
  }

  const db = await getMongoDb();
  const doctors = db.collection("doctors");
  const paymentIntents = db.collection("paymentIntents");

  const doctorDoc = await doctors.findOne({ name: doctor });
  if (!doctorDoc) {
    return NextResponse.json({ error: "Selected doctor is not available" }, { status: 400 });
  }

  const doctorFields = normalizeFields((doctorDoc as any).fields, (doctorDoc as any).specialty);
  const doctorHospitals = normalizeHospitals((doctorDoc as any).hospitals);
  const specialty = specialtyInput || doctorFields[0];
  const venue = venueInput || doctorHospitals[0];

  if (!specialty || !doctorFields.includes(specialty)) {
    return NextResponse.json({ error: "Invalid doctor field selected" }, { status: 400 });
  }
  if (!venue || !doctorHospitals.includes(venue)) {
    return NextResponse.json({ error: "Invalid hospital selected for this doctor" }, { status: 400 });
  }

  const receipt = `apt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const orderPayload = {
    amount: APPOINTMENT_AMOUNT_PAISE,
    currency: "INR",
    receipt,
    notes: {
      uid,
      doctor,
      specialty,
      venue,
      date,
      time,
    },
  };

  const gatewayRes = await fetch(razorpayOrderUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderPayload),
    cache: "no-store",
  });

  const gatewayJson = await gatewayRes.json().catch(() => ({}));
  if (!gatewayRes.ok) {
    console.error(
      `[payments] failed to create Razorpay order uid=${uid} doctor=${doctor} status=${gatewayRes.status}`
    );
    return NextResponse.json(
      { error: gatewayJson?.error?.description || "Failed to create payment order" },
      { status: 502 }
    );
  }

  const now = new Date();
  const orderId = asString(gatewayJson.id);
  if (!orderId) {
    console.error(`[payments] Razorpay response missing order id uid=${uid} doctor=${doctor}`);
    return NextResponse.json({ error: "Invalid payment order response" }, { status: 502 });
  }
  const intent = {
    uid,
    patientEmail,
    patientName,
    doctor,
    specialty,
    venue,
    date,
    time,
    reason,
    amount: APPOINTMENT_AMOUNT_RUPEES,
    amountPaise: APPOINTMENT_AMOUNT_PAISE,
    currency: "INR",
    orderId,
    receipt,
    status: "created",
    gateway: "razorpay",
    createdAt: now,
    updatedAt: now,
  };

  await paymentIntents.updateOne(
    { orderId: intent.orderId },
    { $set: intent },
    { upsert: true }
  );

  console.info(
    `[payments] order created uid=${uid} order=${intent.orderId} doctor=${doctor} venue=${venue}`
  );

  return NextResponse.json({
    data: {
      keyId,
      orderId: intent.orderId,
      amountPaise: APPOINTMENT_AMOUNT_PAISE,
      amount: APPOINTMENT_AMOUNT_RUPEES,
      currency: "INR",
      doctor,
      specialty,
      venue,
      date,
      time,
    },
  });
}
