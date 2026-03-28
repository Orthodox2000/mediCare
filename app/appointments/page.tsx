"use client";
import React, { useEffect, useMemo, useState, useContext } from "react";
import { Calendar, ClipboardList, Clock, Trash2 } from "lucide-react";
import { ThemeContext } from "../components/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/lib/AuthContext";

type AppointmentStatus =
    | "sent"
    | "pending_approval"
    | "approved"
    | "rejected"
    | "cancelled";

type AppointmentDoc = {
    _id: string;
    uid: string;
    doctor: string;
    specialty: string;
    date: string;
    time: string;
    reason?: string | null;
    status: AppointmentStatus;
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

export default function AppointmentsPage() {
    const theme = useContext(ThemeContext)!;
    const { user, loading: authLoading } = useAuth();

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [reason, setReason] = useState("");

    const [appointments, setAppointments] = useState<AppointmentDoc[]>([]);
    const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"];

    const [doctors, setDoctors] = useState<{ name: string; specialty: string }[]>([]);
    const fallbackDoctors = [
        { name: "Dr. Supriya Khandekar", specialty: "Cardiologist" },
        { name: "Dr. Piyush Raut", specialty: "Neurologist" },
        { name: "Dr. Prashant Shinde", specialty: "Dentist" },
        { name: "Dr. Ankit Mali", specialty: "Pediatrician" },
        { name: "Dr. Poonam Shinde", specialty: "Ophthalmologist" },
        { name: "Dr. Atharva More", specialty: "Dermatologist" }
    ];

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/doctors");
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json?.error || "Failed to load doctors");
                const list = (json.data || []).map((d: any) => ({
                    name: String(d.name || ""),
                    specialty: String(d.specialty || ""),
                }));
                if (!cancelled) setDoctors(list.length ? list : fallbackDoctors);
            } catch {
                if (!cancelled) setDoctors(fallbackDoctors);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        return "bg-blue-200 text-blue-900"; // sent
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]);

    const handleBooking = async () => {
        if (!user) {
            alert("Please login to send an appointment request.");
            return;
        }
        if (!selectedDoctor || !selectedDate || !selectedTime) {
            alert("Please complete all fields");
            return;
        }

        const doc = doctors.find(d => d.name === selectedDoctor);
        setBusy(true);
        setError(null);

        try {
            const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    patientEmail: user.email,
                    patientName: user.displayName,
                    doctor: selectedDoctor,
                    specialty: doc?.specialty || "",
                    date: selectedDate,
                    time: selectedTime,
                    reason: reason.trim() || null,
                }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error || "Failed to send appointment");

            const created = json?.data as AppointmentDoc;
            setAppointments((prev) => [created, ...prev]);
            setReason("");
            setSelectedDoctor("");
            setSelectedDate("");
            setSelectedTime("");

            // Refresh after 5 seconds so "sent" becomes "pending_approval"
            setTimeout(() => {
                fetchAppointments().catch(() => { });
                fetchNotifications().catch(() => { });
            }, 5200);

            // Also refresh notifications immediately for the "sent" notification
            fetchNotifications().catch(() => { });
        } catch (e: any) {
            setError(e?.message || "Failed to send appointment");
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

    // Animation variants
    const cardVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.9 },
        visible: {
            opacity: 1, y: 0, scale: 1, transition: {
                type: "spring",
                bounce: 0.35,
                duration: 0.6
            }
        },
        exit: { opacity: 0, y: -20, scale: 0.85, transition: { duration: 0.3 } },
    };

    const statusPulse = {
        initial: { scale: 1 },
        animate: { scale: [1, 1.1, 1], transition: { duration: 0.6 } },
    };

    return (
        <div className={`min-h-screen py-24 px-4 ${theme.bg} ${theme.text}`}>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    Book Your Appointment
                </h1>

                {!authLoading && !user && (
                    <div className={`mb-6 p-4 rounded-xl ${theme.cardBg} ${theme.border} border`}>
                        <p className={`${theme.textSecondary}`}>
                            Login from the top-right to send appointment requests and view your history.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-8">

                    {/* LEFT FORM */}
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

                            {/* Doctor */}
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
                                        <option key={i} value={d.name}>
                                            {d.name} – {d.specialty}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date */}
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

                            {/* Time */}
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

                            {/* Reason */}
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
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:scale-[1.02] transition shadow-lg font-semibold text-lg"
                            >
                                {busy ? "Sending..." : "Send Appointment Request"}
                            </button>
                        </div>
                    </motion.div>

                    {/* RIGHT COLUMN: APPOINTMENTS */}
                    <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center">
                            <ClipboardList className="w-6 h-6 mr-2 text-blue-500" />
                            Your Appointment Requests
                        </h2>

                        {/* Notifications */}
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
                                    layout
                                    className={`p-6 mb-4 rounded-xl ${theme.border} border-2 shadow-sm hover:shadow-xl transition cursor-pointer`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg">{apt.doctor}</h3>
                                            <p className={`${theme.textSecondary} text-sm`}>
                                                {apt.specialty}
                                            </p>
                                            {apt.reason ? (
                                                <p className={`${theme.textSecondary} text-sm mt-1`}>
                                                    {apt.reason}
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
