"use client"
import React, { useState } from 'react';
import { Calendar, ClipboardList, Clock } from 'lucide-react';
import { ThemeContext } from '../components/ThemeProvider';


export default function AppointmentsPage() {
    const theme = React.useContext(ThemeContext)!;
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [selectedDoctor, setSelectedDoctor] = useState<string>('');


    const appointments = [
        { id: 1, doctor: 'Dr. Sarah Johnson', specialty: 'Cardiologist', date: '2024-12-15', time: '10:00 AM', status: 'Confirmed' },
        { id: 2, doctor: 'Dr. Michael Chen', specialty: 'Neurologist', date: '2024-12-18', time: '2:30 PM', status: 'Pending' }
    ];


    const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];
    const doctors = [
        { name: 'Dr. Sarah Johnson', specialty: 'Cardiologist' },
        { name: 'Dr. Michael Chen', specialty: 'Neurologist' },
        { name: 'Dr. Emily Davis', specialty: 'Pediatrician' }
    ];


    return (
        <div className={`min-h-screen py-24 px-4 ${theme.bg} ${theme.text}`}>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Book Your Appointment</h1>


                <div className="grid lg:grid-cols-2 gap-8">
                    <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border transform hover:shadow-2xl transition-all duration-300`}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center"><Calendar className="w-6 h-6 mr-2 text-blue-500" />Schedule New Appointment</h2>


                        <div className="space-y-6">
                            <div>
                                <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>Select Doctor</label>
                                <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className={`w-full px-4 py-3 rounded-xl ${theme.cardBg} ${theme.border} border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none`}>
                                    <option value="">Choose a doctor...</option>
                                    {doctors.map((d, i) => <option key={i} value={d.name}>{d.name} - {d.specialty}</option>)}
                                </select>
                            </div>


                            <div>
                                <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>Select Date</label>
                                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className={`w-full px-4 py-3 rounded-xl ${theme.cardBg} ${theme.border} border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none`} />
                            </div>


                            <div>
                                <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>Select Time</label>
                                <div className="grid grid-cols-3 gap-3">{timeSlots.map((time) => <button key={time} onClick={() => setSelectedTime(time)} className={`py-3 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${selectedTime === time ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-transparent shadow-lg' : `${theme.border} hover:border-blue-500`}`}>{time}</button>)}</div>
                            </div>


                            <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:from-blue-700 hover:to-cyan-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-lg">Book Appointment</button>
                        </div>
                    </div><div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
                        <h2 className="text-2xl font-bold mb-6 flex items-center"><ClipboardList className="w-6 h-6 mr-2 text-blue-500" />Upcoming Appointments</h2>
                        <div className="space-y-4">{appointments.map((apt) => (<div key={apt.id} className={`p-6 rounded-xl ${theme.border} border-2 hover:border-blue-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer`}>
                            <div className="flex justify-between items-start mb-4"><div><h3 className="font-bold text-lg">{apt.doctor}</h3><p className={`${theme.textSecondary} text-sm`}>{apt.specialty}</p></div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${apt.status === 'Confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{apt.status}</span></div>
                            <div className="flex items-center space-x-4 text-sm"><span className="flex items-center"><Calendar className="w-4 h-4 mr-1 text-blue-500" />{apt.date}</span><span className="flex items-center"><Clock className="w-4 h-4 mr-1 text-blue-500" />{apt.time}</span></div>
                        </div>))}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

