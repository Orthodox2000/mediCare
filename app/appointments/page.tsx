"use client";
import React, { useState, useContext } from "react";
import { Calendar, ClipboardList, Clock, Trash2 } from "lucide-react";
import { ThemeContext } from "../components/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";

type Appointment = {
    id: number;
    doctor: string;
    specialty: string;
    date: string;
    time: string;
    status: string;
};

export default function AppointmentsPage() {
    const theme = useContext(ThemeContext)!;

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [selectedDoctor, setSelectedDoctor] = useState("");

    const [appointments, setAppointments] = useState<Appointment[]>([
        {
            id: 1,
            doctor: "Dr. Supriya Khandekar",
            specialty: "Cardiologist",
            date: "2024-12-15",
            time: "10:00 AM",
            status: "Confirmed",
        },
        {
            id: 2,
            doctor: "Dr. Poonam Shinde",
            specialty: "Ophthalmologist",
            date: "2024-12-18",
            time: "2:30 PM",
            status: "Pending",
        },
    ]);

    const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"];

    const doctors = [
        { name: "Dr. Supriya Khandekar", specialty: "Cardiologist" },
        { name: "Dr. Piyush Raut", specialty: "Neurologist" },
        { name: "Dr. Prashant Shinde", specialty: "Dentist" },
        { name: "Dr. Ankit Mali", specialty: "Pediatrician" },
        { name: "Dr. Poonam Shinde", specialty: "Ophthalmologist" },
        { name: "Dr. Atharva More", specialty: "Dermatologist" }
    ];

    const randomStatus = () => {
        const list = ["Confirmed", "Pending"];
        return list[Math.floor(Math.random() * list.length)];
    };

    // Auto-update status 5s after creation
    const updateStatusAfterDelay = (id: number) => {
        setTimeout(() => {
            setAppointments(prev =>
                prev.map(apt =>
                    apt.id === id ? { ...apt, status: randomStatus() } : apt
                )
            );
        }, 5000);
    };

    const handleBooking = () => {
        if (!selectedDoctor || !selectedDate || !selectedTime) {
            alert("Please complete all fields");
            return;
        }

        const doc = doctors.find(d => d.name === selectedDoctor);

        const newApt: Appointment = {
            id: Date.now(),
            doctor: selectedDoctor,
            specialty: doc?.specialty || "",
            date: selectedDate,
            time: selectedTime,
            status: "Pending",
        };

        setAppointments(prev => [...prev, newApt]);
        updateStatusAfterDelay(newApt.id);

        setSelectedDoctor("");
        setSelectedDate("");
        setSelectedTime("");
    };

    const deleteAppointment = (id: number) => {
        setAppointments(prev => prev.filter(a => a.id !== id));
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

                            <button
                                onClick={handleBooking}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:scale-[1.02] transition shadow-lg font-semibold text-lg"
                            >
                                Book Appointment
                            </button>
                        </div>
                    </motion.div>

                    {/* RIGHT COLUMN: APPOINTMENTS */}
                    <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center">
                            <ClipboardList className="w-6 h-6 mr-2 text-blue-500" />
                            Upcoming Appointments
                        </h2>

                        <AnimatePresence>
                            {appointments.map((apt) => (
                                <motion.div
                                    key={apt.id}
                                    variants={cardVariants}
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
                                        </div>

                                        <motion.span
                                            variants={statusPulse}
                                            animate="animate"
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${apt.status === "Confirmed"
                                                    ? "bg-green-200 text-green-800"
                                                    : "bg-yellow-200 text-yellow-900"
                                                }`}
                                        >
                                            {apt.status}
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
                                            onClick={() => deleteAppointment(apt.id)}
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
