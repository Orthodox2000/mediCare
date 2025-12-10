"use client"
import React, { useState } from 'react';
import { Heart, Activity, TrendingUp, Zap } from 'lucide-react';
import { ThemeContext } from '../components/ThemeProvider';


export default function HealthTrackerPage() {
    const theme = React.useContext(ThemeContext)!;
    const [activeMetric, setActiveMetric] = useState('heartRate');


    const healthMetrics = [
        { id: 'heartRate', label: 'Heart Rate', value: '72', unit: 'bpm', icon: Heart, color: 'from-red-500 to-pink-500', status: 'Normal' },
        { id: 'bloodPressure', label: 'Blood Pressure', value: '120/80', unit: 'mmHg', icon: Activity, color: 'from-blue-500 to-cyan-500', status: 'Good' },
        { id: 'weight', label: 'Weight', value: '68', unit: 'kg', icon: TrendingUp, color: 'from-green-500 to-emerald-500', status: 'Stable' },
        { id: 'steps', label: 'Steps Today', value: '8,542', unit: 'steps', icon: Zap, color: 'from-purple-500 to-pink-500', status: 'Active' }
    ];
    return (
        <div className={`min-h-screen py-24 px-4 ${theme.bg} ${theme.text}`}>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Health Tracker</h1>


                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">{healthMetrics.map((metric) => {
                    const Icon = metric.icon; return (<div key={metric.id} onClick={() => setActiveMetric(metric.id)} className={`${theme.cardBg} rounded-2xl p-6 shadow-xl ${theme.border} border transform hover:scale-105 transition-all duration-300 cursor-pointer group ${activeMetric === metric.id ? 'ring-4 ring-blue-500 ring-opacity-50' : ''}`}>
                        <div className="flex items-start justify-between mb-4"><div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300`}><Icon className="w-6 h-6 text-white" /></div><span className={`px-3 py-1 rounded-full text-xs font-semibold ${metric.status === 'Normal' || metric.status === 'Good' || metric.status === 'Stable' || metric.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{metric.status}</span></div><h3 className={`text-sm ${theme.textSecondary} mb-2`}>{metric.label}</h3><div className="flex items-baseline space-x-2"><span className="text-3xl font-bold">{metric.value}</span><span className={`text-sm ${theme.textSecondary}`}>{metric.unit}</span></div></div>)
                })}</div>


                <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border mb-8`}>
                    <h2 className="text-2xl font-bold mb-6">Weekly Trends</h2>
                    <div className="h-64 flex items-end justify-between space-x-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => { const height = Math.random() * 60 + 40; return (<div key={day} className="flex-1 flex flex-col items-center"><div className="w-full bg-gradient-to-t from-blue-600 to-cyan-500 rounded-t-lg hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 cursor-pointer transform hover:scale-105" style={{ height: `${height}%` }}></div><span className={`text-xs mt-2 ${theme.textSecondary}`}>{day}</span></div>) })}</div>
                </div>


                <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
                    <h2 className="text-2xl font-bold mb-6">Log Health Data</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>Metric Type</label>
                            <select className={`w-full px-4 py-3 rounded-xl ${theme.cardBg} ${theme.border} border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none`}>
                                <option>Heart Rate</option>
                                <option>Blood Pressure</option>
                                <option>Weight</option>
                                <option>Blood Sugar</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block mb-2 font-semibold ${theme.textSecondary}`}>Value</label>
                            <input type="text" placeholder="Enter value..." className={`w-full px-4 py-3 rounded-xl ${theme.cardBg} ${theme.border} border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none`} />
                        </div>
                        <div className="md:col-span-2"><button className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:from-blue-700 hover:to-cyan-600 transform hover:scale-105 transition-all duration-300 shadow-lg font-semibold">Save Entry</button></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

