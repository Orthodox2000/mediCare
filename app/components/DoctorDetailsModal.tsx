'use client'
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DoctorDetailsModal({ doctor, onClose }: any) {

    const router = useRouter();
    if (!doctor) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[2000]"
                onClick={onClose}
            >
                <motion.div
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", damping: 18, stiffness: 120 }}
                    className="bg-white rounded-2xl p-8 w-[90%] max-w-lg shadow-2xl relative"
                >
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-6xl">
                        {doctor.image}
                    </div>

                    <h2 className="text-2xl font-bold text-center mt-4">{doctor.name}</h2>
                    <p className="text-center text-gray-500 mt-1">{doctor.specialty}</p>

                    <div className="flex items-center justify-center gap-2 mt-3">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        <span className="font-semibold">{doctor.rating}</span>
                        <span className="text-gray-400">({doctor.patients}+ patients)</span>
                    </div>

                    <button
                        onClick={() => router.push('/appointments')}
                        className="w-full mt-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 
                                   text-white rounded-xl hover:from-blue-700 hover:to-cyan-600 
                                   transform hover:scale-[1.03] transition-all duration-300 
                                   shadow-lg font-semibold"
                    >
                        Book Appointment
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
