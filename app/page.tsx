"use client"
import React, { useEffect, useState } from 'react';
import Navbar from './components/navbar';
import Footer from './components/footer';
import { ThemeContext } from './components/ThemeProvider';
import { Calendar, Users, Activity, Shield, ChevronRight } from 'lucide-react';
export default function HomePage() {
const theme = React.useContext(ThemeContext)!;
const [currentPage, setCurrentPage] = useState('home');
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const [isDark, setIsDark] = useState(false);
const [scrollY, setScrollY] = useState(0);


useEffect(() => {
const handleScroll = () => setScrollY(window.scrollY);
window.addEventListener('scroll', handleScroll);
return () => window.removeEventListener('scroll', handleScroll);
}, []);
const features = [
{ icon: Calendar, title: 'Easy Booking', desc: 'Schedule appointments instantly', color: 'from-blue-500 to-cyan-400' },
{ icon: Users, title: 'Expert Doctors', desc: 'Access to certified professionals', color: 'from-purple-500 to-pink-400' },
{ icon: Activity, title: 'Health Tracking', desc: 'Monitor your vitals & progress', color: 'from-green-500 to-emerald-400' },
{ icon: Shield, title: 'Secure & Private', desc: 'Your data is protected', color: 'from-orange-500 to-red-400' }
];


const stats = [
{ value: '50K+', label: 'Patients Served' },
{ value: '500+', label: 'Expert Doctors' },
{ value: '98%', label: 'Satisfaction Rate' },
{ value: '24/7', label: 'Support Available' }
];
return (
<div className={`min-h-screen ${theme.bg} ${theme.text}`}>
<Navbar isDark={isDark} setIsDark={setIsDark} currentPage={currentPage} setCurrentPage={setCurrentPage} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} scrollY={scrollY} />


<main className="pt-16">
<section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
<div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 opacity-50" />


<div className="relative max-w-7xl mx-auto text-center z-10">
<h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 bg-clip-text text-transparent animate-gradient">Your Health, Our Priority</h1>
<p className={`text-xl sm:text-2xl ${theme.textSecondary} mb-8 max-w-3xl mx-auto`}>Connect with expert doctors, track your health, and manage appointments seamlessly - all in one platform</p>


<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
<button onClick={() => setCurrentPage('appointments')} className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:from-blue-700 hover:to-cyan-600 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center space-x-2">
<span className="text-lg font-semibold">Book Appointment</span>
<ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
</button>


<button onClick={() => setCurrentPage('doctors')} className={`px-8 py-4 ${theme.cardBg} ${theme.border} border-2 rounded-xl hover:shadow-xl transform hover:scale-105 transition-all duration-300`}>
<span className="text-lg font-semibold">Find Doctors</span>
</button>
</div>
</div>
</section>
<section className="py-20 px-4">
<div className="max-w-7xl mx-auto">
<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
{stats.map((stat, i) => (
<div key={i} className={`${theme.cardBg} rounded-2xl p-6 text-center transform hover:scale-105 transition-all duration-300 hover:shadow-xl ${theme.border} border`} style={{ animationDelay: `${i * 100}ms` }}>
<div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">{stat.value}</div>
<div className={theme.textSecondary}>{stat.label}</div>
</div>
))}
</div>
</div>
</section>


<section className="py-20 px-4">
<div className="max-w-7xl mx-auto">
<div className="text-center mb-16">
<h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Why Choose MediCare?</h2>
<p className={`text-xl ${theme.textSecondary}`}>Everything you need for better healthcare management</p>
</div>


<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
{features.map((feature, i) => (
<article key={i} className={`${theme.cardBg} rounded-2xl p-8 transform hover:scale-105 hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-2xl ${theme.border} border group`} style={{ animationDelay: `${i * 100}ms` }}>
<div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 transform group-hover:rotate-6 transition-transform duration-300`}>
<feature.icon className="w-8 h-8 text-white" />
</div>
<h3 className="text-xl font-bold mb-3">{feature.title}</h3>
<p className={theme.textSecondary}>{feature.desc}</p>
</article>
))}
</div>
</div>
</section>
<section className="py-20 px-4">
<div className="max-w-4xl mx-auto">
<div className={`${theme.cardBg} rounded-3xl p-12 text-center shadow-2xl border ${theme.border} relative overflow-hidden`}>
<div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
<div className="relative z-10">
<h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Get Started?</h2>
<p className={`text-lg ${theme.textSecondary} mb-8`}>Join thousands of patients who trust MediCare for their health needs</p>
<button onClick={() => setCurrentPage('appointments')} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:from-blue-700 hover:to-cyan-600 transform hover:scale-105 transition-all duration-300 shadow-xl text-lg font-semibold">Get Started Now</button>
</div>
</div>
</div>
</section>
</main>


<Footer setCurrentPage={setCurrentPage} />
</div>
);
}