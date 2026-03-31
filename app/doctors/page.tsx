'use client'
import React, { useEffect, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { ThemeContext } from '../components/ThemeProvider';
import DoctorDetailsModal from '../components/DoctorDetailsModal';
import { SAMPLE_DOCTORS } from '@/app/lib/sampleDoctors';

type DoctorCard = {
    _id?: string;
    name: string;
    specialty: string;
    fields?: string[];
    hospitals?: string[];
    experience?: string | null;
    rating?: number | null;
    patients?: number | null;
    imageUrl?: string | null;
    image?: React.ReactNode;
};

export default function DoctorsPage() {
    const theme = React.useContext(ThemeContext)!;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedField, setSelectedField] = useState('All');
    const [selectedDoctor, setSelectedDoctor] = useState<DoctorCard | null>(null);
    const [doctors, setDoctors] = useState<DoctorCard[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);

    const fallbackDoctors: DoctorCard[] = SAMPLE_DOCTORS.map((doctor) => ({
        name: doctor.name,
        specialty: doctor.fields[0] || "General Medicine",
        fields: doctor.fields,
        hospitals: doctor.hospitals,
        rating: doctor.rating,
        patients: doctor.patients,
        experience: doctor.experience,
        imageUrl: doctor.imageUrl,
    }));

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadError(null);
            try {
                const res = await fetch("/api/doctors");
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json?.error || "Failed to load doctors");
                const normalized = (json.data || []).map((d: any) => {
                    const fields = Array.isArray(d.fields)
                        ? d.fields.map((f: any) => String(f || "").trim()).filter(Boolean)
                        : [String(d.specialty || "").trim()].filter(Boolean);
                    return {
                        ...d,
                        fields,
                        hospitals: Array.isArray(d.hospitals)
                            ? d.hospitals.map((h: any) => String(h || "").trim()).filter(Boolean)
                            : ['SWACS Hospital'],
                        specialty: fields[0] || String(d.specialty || ""),
                    } as DoctorCard;
                });
                if (!cancelled) setDoctors(normalized.length ? normalized : fallbackDoctors);
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
    }, []);

    const fields = [
        'All',
        ...Array.from(
            new Set(
                doctors.flatMap((d) =>
                    (d.fields && d.fields.length ? d.fields : [d.specialty]).filter(Boolean)
                )
            )
        ),
    ];

    const filteredDoctors = doctors.filter((doc) => {
        const docFields = doc.fields && doc.fields.length ? doc.fields : [doc.specialty];
        const searchable = [doc.name, ...docFields, ...(doc.hospitals || [])].join(' ').toLowerCase();
        const matchesField = selectedField === 'All' || docFields.includes(selectedField);
        const matchesQuery = searchable.includes(searchQuery.toLowerCase());
        return matchesField && matchesQuery;
    });

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

                <div className="mb-12 space-y-4">
                    <div className={`${theme.cardBg} rounded-2xl p-4 shadow-lg ${theme.border} border flex items-center space-x-3`}>
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search doctors by name, field, or hospital..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`flex-1 bg-transparent outline-none ${theme.text}`}
                        />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {fields.map((field) => (
                            <button
                                key={field}
                                onClick={() => setSelectedField(field)}
                                className={`px-6 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${selectedField === field
                                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
                                    : `${theme.cardBg} ${theme.border} border hover:border-blue-500`
                                    }`}
                            >
                                {field}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredDoctors.map((doctor, i) => (
                        <div
                            key={doctor._id || i}
                            className={`${theme.cardBg} rounded-2xl p-6 shadow-xl ${theme.border} border transform hover:scale-105 hover:-translate-y-2 transition-all duration-300 cursor-pointer group`}
                        >
                            <div className="text-center mb-4">
                                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-2xl font-semibold transform group-hover:scale-110 transition-transform duration-300">
                                    {doctor.imageUrl ? (
                                        <img
                                            src={doctor.imageUrl}
                                            className='rounded-full h-full w-full object-cover'
                                            alt={doctor.name}
                                        />
                                    ) : (
                                        doctor.image || <span>Dr</span>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold mb-1">{doctor.name}</h3>
                                <p className={`${theme.textSecondary} text-sm mb-2`}>
                                    {(doctor.fields && doctor.fields.length ? doctor.fields : [doctor.specialty]).join(", ")}
                                </p>
                                <p className={`${theme.textSecondary} text-xs`}>
                                    Venue: {(doctor.hospitals || []).join(", ") || "SWACS Hospital"}
                                </p>
                                <p className={`${theme.textSecondary} text-xs mt-1`}>
                                    {doctor.experience || "--"} experience
                                </p>
                            </div>

                            <div className="flex items-center justify-between mb-4 text-sm">
                                <div className="flex items-center space-x-1">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-semibold">{doctor.rating ?? "--"}</span>
                                </div>
                                <div className={theme.textSecondary}>{doctor.patients ?? "--"} patients</div>
                            </div>

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

            <DoctorDetailsModal doctor={selectedDoctor} onClose={() => setSelectedDoctor(null)} />
        </div>
    );
}
