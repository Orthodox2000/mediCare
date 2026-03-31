"use client";
import React, { useEffect, useMemo, useState, useContext } from "react";
import Script from "next/script";
import { Calendar, ClipboardList, Clock, Trash2 } from "lucide-react";
import { ThemeContext } from "../components/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/lib/AuthContext";
import { SAMPLE_DOCTORS } from "@/app/lib/sampleDoctors";

type AppointmentStatus =
    | "sent"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "cancelled";

type BookingFlowState =
    | "idle"
    | "creating_order"
    | "awaiting_payment"
    | "verifying_payment"
    | "payment_success"
    | "payment_cancelled"
    | "payment_failed";

type DoctorOption = {
    name: string;
    specialty: string;
    fields: string[];
    hospitals: string[];
};

type AppointmentDoc = {
    _id: string;
    uid: string;
    doctor: string;
    specialty: string;
    venue?: string | null;
    date: string;
    time: string;
    reason?: string | null;
    status: AppointmentStatus;
    paymentStatus?: string | null;
    paymentFailureReason?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

type NotificationDoc = {
    _id: string;
    uid: string;
    type: string;
    title: string;
    message: string;
    createdAt: string;
    readAt: string | null;
    meta?: Record<string, any>;
};

type PaymentOrderData = {
    keyId: string;
    orderId: string;
    amountPaise: number;
    amount: number;
    currency: string;
    doctor: string;
    specialty: string;
    venue: string;
    date: string;
    time: string;
};

type PaymentResolution =
    | {
        outcome: "success";
        orderId: string;
        paymentId: string;
        signature: string;
    }
    | {
        outcome: "failed" | "cancelled";
        orderId: string;
        paymentId?: string;
        signature?: string;
        reason: string;
    };

const PAYMENT_AMOUNT = 200;
const RAZORPAY_CHECKOUT_URL =
    process.env.NEXT_PUBLIC_RAZORPAY_CHECKOUT_URL?.trim() ||
    "https://checkout.razorpay.com/v1/checkout.js";

export default function AppointmentsPage() {
    const theme = useContext(ThemeContext)!;
    const { user, loading: authLoading } = useAuth();

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [selectedField, setSelectedField] = useState("");
    const [selectedVenue, setSelectedVenue] = useState("");
    const [reason, setReason] = useState("");

    const [appointments, setAppointments] = useState<AppointmentDoc[]>([]);
    const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
    const [busy, setBusy] = useState(false);
    const [flowState, setFlowState] = useState<BookingFlowState>("idle");
    const [error, setError] = useState<string | null>(null);

    const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"];

    const [doctors, setDoctors] = useState<DoctorOption[]>([]);
    const fallbackDoctors: DoctorOption[] = SAMPLE_DOCTORS.map((doctor) => ({
        name: doctor.name,
        specialty: doctor.fields[0] || "General Medicine",
        fields: doctor.fields,
        hospitals: doctor.hospitals,
    }));

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/doctors");
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json?.error || "Failed to load doctors");
                const list = (json.data || []).map((d: any) => {
                    const fields = Array.isArray(d.fields)
                        ? d.fields.map((f: any) => String(f || "").trim()).filter(Boolean)
                        : [String(d.specialty || "").trim()].filter(Boolean);
                    const hospitals = Array.isArray(d.hospitals)
                        ? d.hospitals.map((h: any) => String(h || "").trim()).filter(Boolean)
                        : ["SWACS Hospital"];
                    return {
                        name: String(d.name || ""),
                        specialty: String(d.specialty || fields[0] || ""),
                        fields: fields.length ? fields : [String(d.specialty || "")],
                        hospitals: hospitals.length ? hospitals : ["SWACS Hospital"],
                    } as DoctorOption;
                });
                if (!cancelled) {
                    const source = list.length ? list : fallbackDoctors;
                    setDoctors(source);
                    if (!selectedDoctor && source.length) {
                        setSelectedDoctor(source[0].name);
                        setSelectedField(source[0].fields[0] || source[0].specialty);
                        setSelectedVenue(source[0].hospitals[0] || "SWACS Hospital");
                    }
                }
            } catch {
                if (!cancelled) {
                    setDoctors(fallbackDoctors);
                    if (!selectedDoctor) {
                        setSelectedDoctor(fallbackDoctors[0].name);
                        setSelectedField(fallbackDoctors[0].fields[0]);
                        setSelectedVenue(fallbackDoctors[0].hospitals[0]);
                    }
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const selectedDoctorDoc = useMemo(
        () => doctors.find((d) => d.name === selectedDoctor),
        [doctors, selectedDoctor]
    );

    useEffect(() => {
        if (!selectedDoctorDoc) return;
        if (!selectedField || !selectedDoctorDoc.fields.includes(selectedField)) {
            setSelectedField(selectedDoctorDoc.fields[0] || selectedDoctorDoc.specialty);
        }
        if (!selectedVenue || !selectedDoctorDoc.hospitals.includes(selectedVenue)) {
            setSelectedVenue(selectedDoctorDoc.hospitals[0] || "SWACS Hospital");
        }
    }, [selectedDoctorDoc, selectedField, selectedVenue]);

    const flowMessage = useMemo(() => {
        if (flowState === "creating_order") return "Creating payment order for INR 200.";
        if (flowState === "awaiting_payment") return "Opening Razorpay checkout.";
        if (flowState === "verifying_payment") return "Verifying payment and booking appointment.";
        if (flowState === "payment_success") return "Payment successful. Appointment sent to admin.";
        if (flowState === "payment_cancelled") return "Payment cancelled. Marked as failed booking.";
        if (flowState === "payment_failed") return "Payment failed. Marked as failed booking.";
        return "Fill appointment details and click the payment card to begin checkout.";
    }, [flowState]);

    const statusLabel = useMemo(() => {
        return {
            sent: "Sent",
            pending_approval: "Pending Approval",
            approved: "Approved",
            rejected: "Rejected",
            cancelled: "Cancelled",
        } as const;
    }, []);

    const statusPillClass = (status: AppointmentStatus) => {
        if (status === "approved") return "bg-green-200 text-green-800";
        if (status === "pending_approval") return "bg-yellow-200 text-yellow-900";
        if (status === "rejected") return "bg-red-200 text-red-800";
        if (status === "cancelled") return "bg-gray-200 text-gray-800";
        return "bg-blue-200 text-blue-900";
    };

    const fetchAppointments = async () => {
        if (!user) return;
        const res = await fetch(`/api/appointments?uid=${encodeURIComponent(user.uid)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load appointments");
        setAppointments((json?.data || []) as AppointmentDoc[]);
    };

    const fetchNotifications = async () => {
        if (!user) return;
        const res = await fetch(`/api/notifications?uid=${encodeURIComponent(user.uid)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load notifications");
        setNotifications((json?.data || []) as NotificationDoc[]);
    };

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            setError(null);
            try {
                await Promise.all([fetchAppointments(), fetchNotifications()]);
            } catch (e: any) {
                if (!cancelled) setError(e?.message || "Failed to load data");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    const openRazorpayCheckout = (order: PaymentOrderData): Promise<PaymentResolution> => {
        return new Promise((resolve, reject) => {
            const RazorpayCtor = (window as any).Razorpay;
            if (!RazorpayCtor) {
                reject(new Error("Razorpay checkout not loaded. Please refresh."));
                return;
            }

            let settled = false;
            const done = (data: PaymentResolution) => {
                if (settled) return;
                settled = true;
                resolve(data);
            };

            const rz = new RazorpayCtor({
                key: order.keyId,
                amount: order.amountPaise,
                currency: order.currency,
                order_id: order.orderId,
                name: "MediCare",
                description: `Appointment fee (INR ${order.amount})`,
                prefill: {
                    name: user?.displayName || "",
                    email: user?.email || "",
                },
                notes: {
                    doctor: order.doctor,
                    venue: order.venue,
                    date: order.date,
                    time: order.time,
                },
                handler: (response: any) => {
                    done({
                        outcome: "success",
                        orderId: response.razorpay_order_id || order.orderId,
                        paymentId: response.razorpay_payment_id,
                        signature: response.razorpay_signature,
                    });
                },
                modal: {
                    ondismiss: () =>
                        done({
                            outcome: "cancelled",
                            orderId: order.orderId,
                            reason: "Checkout window closed.",
                        }),
                },
                theme: {
                    color: "#0284c7",
                },
            });

            rz.on("payment.failed", (response: any) => {
                done({
                    outcome: "failed",
                    orderId: response?.error?.metadata?.order_id || order.orderId,
                    paymentId: response?.error?.metadata?.payment_id || undefined,
                    reason: response?.error?.description || "Payment failed",
                });
            });

            rz.open();
        });
    };

    const clearForm = () => {
        setSelectedDate("");
        setSelectedTime("");
        setReason("");
    };

    const handleBooking = async () => {
        if (!user) {
            setError("Please login to book an appointment.");
            return;
        }
        if (!selectedDoctor || !selectedField || !selectedVenue || !selectedDate || !selectedTime) {
            setError("Please complete doctor, field, venue, date, and time.");
            return;
        }

        setBusy(true);
        setError(null);
        setFlowState("creating_order");

        try {
            const orderRes = await fetch("/api/appointments/payment/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    patientEmail: user.email,
                    patientName: user.displayName,
                    doctor: selectedDoctor,
                    specialty: selectedField,
                    venue: selectedVenue,
                    date: selectedDate,
                    time: selectedTime,
                    reason: reason.trim() || null,
                }),
            });
            const orderJson = await orderRes.json().catch(() => ({}));
            if (!orderRes.ok) throw new Error(orderJson?.error || "Failed to create payment order");

            const order = orderJson.data as PaymentOrderData;
            setFlowState("awaiting_payment");
            const resolution = await openRazorpayCheckout(order);

            setFlowState("verifying_payment");
            const verifyRes = await fetch("/api/appointments/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    razorpayOrderId: resolution.orderId,
                    razorpayPaymentId: "paymentId" in resolution ? resolution.paymentId : null,
                    razorpaySignature: "signature" in resolution ? resolution.signature : null,
                    outcome: resolution.outcome,
                    failureReason: "reason" in resolution ? resolution.reason : null,
                }),
            });
            const verifyJson = await verifyRes.json().catch(() => ({}));
            if (!verifyRes.ok) throw new Error(verifyJson?.error || "Failed to verify payment");

            await Promise.all([fetchAppointments(), fetchNotifications()]);

            if (resolution.outcome === "success") {
                setFlowState("payment_success");
                clearForm();
            } else {
                setFlowState(
                    resolution.outcome === "cancelled" ? "payment_cancelled" : "payment_failed"
                );
                setError("Payment failed. Please try again.");
                clearForm();
            }
        } catch (e: any) {
            setFlowState("payment_failed");
            setError(e?.message || "Failed to complete payment.");
            clearForm();
        } finally {
            setBusy(false);
        }
    };

    const cancelAppointment = async (id: string) => {
        if (!user) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/appointments?uid=${encodeURIComponent(user.uid)}&id=${encodeURIComponent(id)}`,
                { method: "DELETE" }
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error || "Failed to cancel appointment");
            await Promise.all([fetchAppointments(), fetchNotifications()]);
        } catch (e: any) {
            setError(e?.message || "Failed to cancel appointment");
        } finally {
            setBusy(false);
        }
    };

    const markNotificationRead = async (id: string) => {
        if (!user) return;
        try {
            await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user.uid, id, action: "mark_read" }),
            });
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
            );
        } catch {
            // ignore
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.9 },
        visible: {
            opacity: 1, y: 0, scale: 1, transition: {
                type: "spring" as const,
                bounce: 0.35,
                duration: 0.6
            }
        },
        exit: { opacity: 0, y: -20, scale: 0.85, transition: { duration: 0.3 } },
    };

    const statusPulse = {
        initial: { scale: 1 },
        animate: { scale: [1, 1.05, 1], transition: { duration: 0.6 } },
    };

    return (
        <div className={`min-h-screen py-24 px-4 ${theme.bg} ${theme.text}`}>
            <Script src={RAZORPAY_CHECKOUT_URL} strategy="afterInteractive" />
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    Book Your Appointment
                </h1>

                {!authLoading && !user && (
                    <div className={`mb-6 p-4 rounded-xl ${theme.cardBg} ${theme.border} border`}>
                        <p className={`${theme.textSecondary}`}>
                            Login from the top-right to book appointments and view status updates.
                        </p>
                    </div>
                )}

                <div className={`mb-6 p-4 rounded-xl ${theme.cardBg} ${theme.border} border`}>
                    <p className="font-semibold text-sm">Booking Flow</p>
                    <p className={`${theme.textSecondary} text-sm mt-1`}>
                        1. Fill doctor details and preferred slot. 2. Click Pay card to start Razorpay checkout.
                        3. Result is recorded automatically for success/failure/cancel.
                    </p>
                    <p className="text-sm mt-2">{flowMessage}</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-8">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}
                    >
                        <h2 className="text-2xl font-bold mb-6 flex items-center">
                            <Calendar className="w-6 h-6 mr-2 text-blue-500" />
                            Schedule New Appointment
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>
                                    Select Doctor
                                </label>
                                <select
                                    value={selectedDoctor}
                                    onChange={(e) => setSelectedDoctor(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl ${theme.cardBg} ${theme.border} border-2 focus:border-blue-500`}
                                >
                                    <option value="">Choose a doctor...</option>
                                    {doctors.map((d, i) => (
                                        <option key={`${d.name}-${i}`} value={d.name}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>
                                    Select Field
                                </label>
                                <select
                                    value={selectedField}
                                    onChange={(e) => setSelectedField(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl ${theme.cardBg} ${theme.border} border-2 focus:border-blue-500`}
                                >
                                    {(selectedDoctorDoc?.fields || []).map((field) => (
                                        <option key={field} value={field}>
                                            {field}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>
                                    Select Venue
                                </label>
                                <select
                                    value={selectedVenue}
                                    onChange={(e) => setSelectedVenue(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl ${theme.cardBg} ${theme.border} border-2 focus:border-blue-500`}
                                >
                                    {(selectedDoctorDoc?.hospitals || ["SWACS Hospital"]).map((hospital) => (
                                        <option key={hospital} value={hospital}>
                                            {hospital}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>
                                    Select Date
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    min={new Date().toISOString().split("T")[0]}
                                    className={`w-full px-4 py-3 rounded-xl ${theme.cardBg} ${theme.border} border-2`}
                                />
                            </div>

                            <div>
                                <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>
                                    Select Time
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {timeSlots.map((time) => (
                                        <button
                                            key={time}
                                            onClick={() => setSelectedTime(time)}
                                            className={`py-3 rounded-xl border-2 transition ${selectedTime === time
                                                ? "bg-blue-600 text-white shadow-lg"
                                                : `${theme.border} hover:border-blue-500`
                                                }`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>
                                    Reason (optional)
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Briefly describe your concern..."
                                    className={`w-full px-4 py-3 rounded-xl ${theme.cardBg} ${theme.border} border-2`}
                                    rows={3}
                                    maxLength={240}
                                />
                            </div>

                            <button
                                onClick={handleBooking}
                                disabled={busy}
                                className="w-full rounded-xl border-2 border-cyan-400 bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-5 text-left hover:scale-[1.01] transition shadow-lg disabled:opacity-70"
                            >
                                <p className="font-bold text-lg">
                                    {busy ? "Processing payment..." : `Pay INR ${PAYMENT_AMOUNT}`}
                                </p>
                                <p className="text-sm opacity-95 mt-1">
                                    Tap anywhere on this card to open Razorpay checkout
                                </p>
                            </button>
                        </div>
                    </motion.div>

                    <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center">
                            <ClipboardList className="w-6 h-6 mr-2 text-blue-500" />
                            Your Appointment Requests
                        </h2>

                        {user && (
                            <div className="mb-6">
                                <h3 className="font-semibold mb-3">Notifications</h3>
                                <div className="space-y-2">
                                    {notifications.length === 0 && (
                                        <p className={`${theme.textSecondary} text-sm`}>
                                            No notifications yet.
                                        </p>
                                    )}
                                    {notifications.slice(0, 6).map((n) => (
                                        <button
                                            key={n._id}
                                            onClick={() => markNotificationRead(n._id)}
                                            className={`w-full text-left p-3 rounded-xl border ${theme.border} hover:shadow-sm transition ${n.readAt ? "opacity-75" : ""}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold text-sm">{n.title}</p>
                                                {!n.readAt && (
                                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`${theme.textSecondary} text-sm mt-1`}>
                                                {n.message}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <AnimatePresence>
                            {appointments.map((apt) => (
                                <motion.div
                                    key={apt._id}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    variants={cardVariants}
                                    layout
                                    className={`p-6 mb-4 rounded-xl ${theme.border} border-2 shadow-sm hover:shadow-xl transition`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg">{apt.doctor}</h3>
                                            <p className={`${theme.textSecondary} text-sm`}>
                                                {apt.specialty} | Venue: {apt.venue || "TBD"}
                                            </p>
                                            {apt.reason ? (
                                                <p className={`${theme.textSecondary} text-sm mt-1`}>
                                                    {apt.reason}
                                                </p>
                                            ) : null}
                                            {apt.paymentStatus ? (
                                                <p className={`${theme.textSecondary} text-xs mt-1`}>
                                                    Payment: {apt.paymentStatus}
                                                    {apt.paymentFailureReason ? ` (${apt.paymentFailureReason})` : ""}
                                                </p>
                                            ) : null}
                                        </div>

                                        <motion.span
                                            variants={statusPulse}
                                            animate="animate"
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusPillClass(apt.status)}`}
                                        >
                                            {statusLabel[apt.status]}
                                        </motion.span>
                                    </div>

                                    <div className="flex justify-between items-center mt-4">
                                        <div className="flex space-x-4 text-sm">
                                            <span className="flex items-center">
                                                <Calendar className="w-4 h-4 mr-1 text-blue-500" />
                                                {apt.date}
                                            </span>
                                            <span className="flex items-center">
                                                <Clock className="w-4 h-4 mr-1 text-blue-500" />
                                                {apt.time}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => cancelAppointment(apt._id)}
                                            disabled={busy || apt.status === "cancelled"}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
