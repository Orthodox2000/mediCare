'use client'
import React, { useEffect, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { ThemeContext } from '../components/ThemeProvider';
import DoctorDetailsModal from '../components/DoctorDetailsModal';

export default function DoctorsPage() {
    const theme = React.useContext(ThemeContext)!;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('All');
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);

    const fallbackDoctors = [
        { name: 'Dr. Supriya Khandekar ', specialty: 'Cardiologist', rating: 4.9, patients: 3500, image: <img src={"./spk.png"} className='rounded-full h-full w-full'></img>, experience: '15 years' },
        { name: 'Dr. Piyush Raut', specialty: 'Neurologist', rating: 4.8, patients: 2100, image: '👨‍⚕️', experience: '12 years' },
        { name: 'Dr. Poonam Shinde', specialty: 'Pediatrician', rating: 4.9, patients: 3200, image: '👩', experience: '10 years' },
        { name: 'Dr. Prashant Shinde', specialty: 'Orthopedic', rating: 4.7, patients: 1800, image: '👨‍⚕️', experience: '18 years' },
        { name: 'Dr. Diksha', specialty: 'Dermatologist', rating: 4.8, patients: 2400, image: '👩‍⚕️', experience: '14 years' },
        { name: 'Dr. Ankit Mali', specialty: 'Psychiatrist', rating: 4.9, patients: 1900, image: '👨‍⚕️', experience: '16 years' },
        { name: 'Dr. Sneha Mav', specialty: 'Psychiatrist', rating: 4.5, patients: 1000, image: '👨‍⚕️', experience: '5 years' }

    ];

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadError(null);
            try {
                const res = await fetch("/api/doctors");
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json?.error || "Failed to load doctors");
                if (!cancelled) setDoctors(json.data || []);
            } catch (e: any) {
                if (!cancelled) {
                    setLoadError(e?.message || "Failed to load doctors");
                    setDoctors(fallbackDoctors);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const specialties = [
        'All',
        ...Array.from(new Set(doctors.map((d) => d.specialty).filter(Boolean))),
    ];

    const filteredDoctors = doctors.filter(
        doc =>
            (selectedSpecialty === 'All' || doc.specialty === selectedSpecialty) &&
            (doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className={`min-h-screen py-24 px-4 ${theme.bg} ${theme.text}`}>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    Our Expert Doctors
                </h1>

                {loadError && (
                    <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
                        {loadError}
                    </div>
                )}

                {/* Search + Filters */}
                <div className="mb-12 space-y-4">
                    <div className={`${theme.cardBg} rounded-2xl p-4 shadow-lg ${theme.border} border flex items-center space-x-3`}>
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search doctors by name or specialty..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`flex-1 bg-transparent outline-none ${theme.text}`}
                        />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {specialties.map((spec) => (
                            <button
                                key={spec}
                                onClick={() => setSelectedSpecialty(spec)}
                                className={`px-6 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${selectedSpecialty === spec
                                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
                                    : `${theme.cardBg} ${theme.border} border hover:border-blue-500`
                                    }`}
                            >
                                {spec}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Doctor Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredDoctors.map((doctor, i) => (
                        <div
                            key={i}
                            className={`${theme.cardBg} rounded-2xl p-6 shadow-xl ${theme.border} border transform hover:scale-105 hover:-translate-y-2 transition-all duration-300 cursor-pointer group`}
                        >
                            <div className="text-center mb-4">
                                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-5xl transform group-hover:scale-110 transition-transform duration-300">
                                    {doctor.imageUrl ? (
                                        <img
                                            src={doctor.imageUrl}
                                            className='rounded-full h-full w-full object-cover'
                                            alt={doctor.name}
                                        />
                                    ) : (
                                        doctor.image || <span>👨‍⚕️</span>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold mb-1">{doctor.name}</h3>
                                <p className={`${theme.textSecondary} text-sm mb-2`}>{doctor.specialty}</p>
                                <p className={`${theme.textSecondary} text-xs`}>{doctor.experience || "—"} experience</p>
                            </div>

                            <div className="flex items-center justify-between mb-4 text-sm">
                                <div className="flex items-center space-x-1">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-semibold">{doctor.rating ?? "—"}</span>
                                </div>
                                <div className={theme.textSecondary}>{doctor.patients ?? "—"} patients</div>
                            </div>

                            {/* SHOW DETAILS BUTTON */}
                            <button
                                onClick={() => setSelectedDoctor(doctor)}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:from-blue-700 hover:to-cyan-600 transform hover:scale-105 transition-all duration-300 shadow-lg font-semibold"
                            >
                                Show Details
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            <DoctorDetailsModal doctor={selectedDoctor} onClose={() => setSelectedDoctor(null)} />
        </div>
    );
}
