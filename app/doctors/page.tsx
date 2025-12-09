'use client'
import React, { useState } from 'react';
import { Search, Star } from 'lucide-react';
import { ThemeContext } from '../components/ThemeProvider';


export default function DoctorsPage() {
const theme = React.useContext(ThemeContext)!;
const [searchQuery, setSearchQuery] = useState('');
const [selectedSpecialty, setSelectedSpecialty] = useState('All');
const doctors = [
{ name: 'Dr. Sarah Johnson', specialty: 'Cardiologist', rating: 4.9, patients: 2500, image: '👩‍⚕️', experience: '15 years' },
{ name: 'Dr. Michael Chen', specialty: 'Neurologist', rating: 4.8, patients: 2100, image: '👨‍⚕️', experience: '12 years' },
{ name: 'Dr. Emily Davis', specialty: 'Pediatrician', rating: 4.9, patients: 3200, image: '👩‍⚕️', experience: '10 years' },
{ name: 'Dr. James Wilson', specialty: 'Orthopedic', rating: 4.7, patients: 1800, image: '👨‍⚕️', experience: '18 years' },
{ name: 'Dr. Lisa Anderson', specialty: 'Dermatologist', rating: 4.8, patients: 2400, image: '👩‍⚕️', experience: '14 years' },
{ name: 'Dr. Robert Lee', specialty: 'Psychiatrist', rating: 4.9, patients: 1900, image: '👨‍⚕️', experience: '16 years' }
];
const specialties = ['All','Cardiologist','Neurologist','Pediatrician','Orthopedic','Dermatologist','Psychiatrist'];


const filteredDoctors = doctors.filter(doc => (selectedSpecialty === 'All' || doc.specialty === selectedSpecialty) && (doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())));


return (
<div className={`min-h-screen py-24 px-4 ${theme.bg} ${theme.text}`}>
<div className="max-w-7xl mx-auto">
<h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Our Expert Doctors</h1>


<div className="mb-12 space-y-4">
<div className={`${theme.cardBg} rounded-2xl p-4 shadow-lg ${theme.border} border flex items-center space-x-3`}>
<Search className="w-5 h-5 text-gray-400" />
<input type="text" placeholder="Search doctors by name or specialty..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`flex-1 bg-transparent outline-none ${theme.text}`} />
</div>


<div className="flex flex-wrap gap-3">{specialties.map((spec) => (<button key={spec} onClick={() => setSelectedSpecialty(spec)} className={`px-6 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${selectedSpecialty === spec ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg' : `${theme.cardBg} ${theme.border} border hover:border-blue-500`}`}>{spec}</button>))}</div>
</div>


<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{filteredDoctors.map((doctor, i) => (<div key={i} className={`${theme.cardBg} rounded-2xl p-6 shadow-xl ${theme.border} border transform hover:scale-105 hover:-translate-y-2 transition-all duration-300 cursor-pointer group`}>
<div className="text-center mb-4"><div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-5xl transform group-hover:scale-110 transition-transform duration-300">{doctor.image}</div><h3 className="text-xl font-bold mb-1">{doctor.name}</h3><p className={`${theme.textSecondary} text-sm mb-2`}>{doctor.specialty}</p><p className={`${theme.textSecondary} text-xs`}>{doctor.experience} experience</p></div>
<div className="flex items-center justify-between mb-4 text-sm"><div className="flex items-center space-x-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /><span className="font-semibold">{doctor.rating}</span></div><div className={theme.textSecondary}>{doctor.patients}+ patients</div></div>
<button className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:from-blue-700 hover:to-cyan-600 transform hover:scale-105 transition-all duration-300 shadow-lg font-semibold">Book Appointment</button>
</div>))}</div>
</div>
</div>
);
}


