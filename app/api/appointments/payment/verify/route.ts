import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/app/lib/mongo";

type PaymentOutcome = "success" | "failed" | "cancelled";

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const getAppointmentMessage = (data: {
  doctor: string;
  date: string;
  time: string;
  venue?: string | null;
}) => `${data.doctor} | ${data.date} | ${data.time} | Venue: ${data.venue || "TBD"}`;

const verifySignature = (params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}) => {
  const body = `${params.orderId}|${params.paymentId}`;
  const generated = crypto.createHmac("sha256", params.secret).update(body).digest("hex");
  return generated === params.signature;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const uid = asString((body as any).uid);
  const orderId = asString((body as any).razorpayOrderId);
  const paymentId = asString((body as any).razorpayPaymentId);
  const signature = asString((body as any).razorpaySignature);
  const outcome = asString((body as any).outcome) as PaymentOutcome;
  const failureReason = asString((body as any).failureReason).slice(0, 240) || null;

  if (!uid || !orderId) {
    return NextResponse.json({ error: "Missing uid or order id" }, { status: 400 });
  }
  if (outcome && !["success", "failed", "cancelled"].includes(outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  const resolvedOutcome: PaymentOutcome =
    outcome || (paymentId && signature ? "success" : "cancelled");

  const db = await getMongoDb();
  const paymentIntents = db.collection("paymentIntents");
  const appointments = db.collection("appointments");
  const notifications = db.collection("notifications");

  const intent = await paymentIntents.findOne({ orderId, uid });
  if (!intent) {
    return NextResponse.json(
      { error: "Payment intent not found. Please restart booking." },
      { status: 404 }
    );
  }

  if (intent.status === "paid" && intent.appointmentId) {
    const existing = await appointments.findOne({ _id: intent.appointmentId });
    return NextResponse.json({
      data: existing,
      message: "Appointment already booked for this payment.",
    });
  }

  if (resolvedOutcome === "success") {
    const keySecret = asString(process.env.RAZORPAY_KEY_SECRET);
    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay key secret is not configured on the server" },
        { status: 500 }
      );
    }
    if (!paymentId || !signature) {
      return NextResponse.json(
        { error: "Missing payment id or signature for verification" },
        { status: 400 }
      );
    }

    const isValid = verifySignature({
      orderId,
      paymentId,
      signature,
      secret: keySecret,
    });

    if (!isValid) {
      console.warn(`[payments] signature mismatch uid=${uid} order=${orderId}`);
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const now = new Date();
    const appointment = {
      uid: intent.uid,
      patientEmail: intent.patientEmail ?? null,
      patientName: intent.patientName ?? null,
      doctor: intent.doctor,
      specialty: intent.specialty,
      venue: intent.venue,
      date: intent.date,
      time: intent.time,
      reason: intent.reason ?? null,
      status: "sent",
      statusExpiresAt: new Date(now.getTime() + 5000),
      paymentStatus: "paid",
      paymentAmount: intent.amount,
      paymentCurrency: intent.currency || "INR",
      paymentOrderId: orderId,
      paymentId,
      paymentSignature: signature,
      paymentFailureReason: null,
      createdAt: now,
      updatedAt: now,
    };

    const created = await appointments.insertOne(appointment);
    await notifications.insertOne({
      uid: intent.uid,
      type: "appointment.sent",
      title: "Appointment request sent",
      message: `Payment received. Appointment request sent (${getAppointmentMessage({
        doctor: intent.doctor,
        date: intent.date,
        time: intent.time,
        venue: intent.venue,
      })}).`,
      createdAt: now,
      readAt: null,
      meta: { appointmentId: String(created.insertedId) },
    });

    await paymentIntents.updateOne(
      { _id: intent._id },
      {
        $set: {
          status: "paid",
          paymentId,
          signature,
          appointmentId: created.insertedId,
          verifiedAt: now,
          updatedAt: now,
        },
      }
    );

    console.info(
      `[payments] verified uid=${uid} order=${orderId} appointment=${String(created.insertedId)}`
    );

    return NextResponse.json({
      data: { ...appointment, _id: created.insertedId },
      message: "Payment successful. Appointment sent to admin for confirmation.",
    });
  }

  if (intent.status === "paid") {
    return NextResponse.json(
      { error: "Payment already completed for this order" },
      { status: 409 }
    );
  }

  if (intent.appointmentId) {
    const existing = await appointments.findOne({ _id: intent.appointmentId });
    return NextResponse.json({
      data: existing,
      message: "Booking was already marked cancelled for this payment.",
    });
  }

  const now = new Date();
  const cancelledAppointment = {
    uid: intent.uid,
    patientEmail: intent.patientEmail ?? null,
    patientName: intent.patientName ?? null,
    doctor: intent.doctor,
    specialty: intent.specialty,
    venue: intent.venue,
    date: intent.date,
    time: intent.time,
    reason: intent.reason ?? null,
    status: "cancelled",
    paymentStatus: resolvedOutcome,
    paymentAmount: intent.amount,
    paymentCurrency: intent.currency || "INR",
    paymentOrderId: orderId,
    paymentId: paymentId || null,
    paymentSignature: signature || null,
    paymentFailureReason: failureReason || "Payment was not completed",
    createdAt: now,
    updatedAt: now,
  };

  const cancelled = await appointments.insertOne(cancelledAppointment);
  await notifications.insertOne({
    uid: intent.uid,
    type: "appointment.cancelled",
    title: "Appointment booking cancelled",
    message: `Booking cancelled because payment was not completed (${getAppointmentMessage({
      doctor: intent.doctor,
      date: intent.date,
      time: intent.time,
      venue: intent.venue,
    })}).`,
    createdAt: now,
    readAt: null,
    meta: { appointmentId: String(cancelled.insertedId), orderId },
  });

  await paymentIntents.updateOne(
    { _id: intent._id },
    {
      $set: {
        status: resolvedOutcome,
        paymentId: paymentId || null,
        signature: signature || null,
        appointmentId: cancelled.insertedId,
        failureReason: failureReason || "Payment was not completed",
        updatedAt: now,
      },
    }
  );

  console.info(
    `[payments] marked ${resolvedOutcome} uid=${uid} order=${orderId} appointment=${String(
      cancelled.insertedId
    )}`
  );

  return NextResponse.json({
    data: { ...cancelledAppointment, _id: cancelled.insertedId },
    message: "Payment was not completed. Booking has been cancelled.",
  });
}

