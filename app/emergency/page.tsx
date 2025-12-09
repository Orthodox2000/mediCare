"use client"
import React from 'react';
import { Phone, MessageSquare, MapPin, Heart, CheckCircle, Zap, Bell, ChevronRight } from 'lucide-react';
import { ThemeContext } from '../components/ThemeProvider';


export default function EmergencyPage() {
const theme = React.useContext(ThemeContext)!;


const emergencyContacts = [
{ name: 'Emergency Ambulance', number: '911', icon: Phone, color: 'from-red-500 to-pink-500' },
{ name: 'Poison Control', number: '1-800-222-1222', icon: Phone, color: 'from-orange-500 to-red-500' },
{ name: 'Mental Health Crisis', number: '988', icon: MessageSquare, color: 'from-purple-500 to-pink-500' },
{ name: 'Nearest Hospital', number: '+1-555-0123', icon: MapPin, color: 'from-blue-500 to-cyan-500' }
];


const firstAidTips = [
{ title: 'CPR', desc: 'Push hard and fast in center of chest', icon: Heart },
{ title: 'Choking', desc: 'Perform Heimlich maneuver', icon: CheckCircle },
{ title: 'Bleeding', desc: 'Apply firm pressure with clean cloth', icon: CheckCircle },
{ title: 'Burns', desc: 'Cool with running water for 10 mins', icon: Zap }
];
return (
<div className={`min-h-screen py-24 px-4 ${theme.bg} ${theme.text}`}>
<div className="max-w-7xl mx-auto">
<div className="text-center mb-12"><h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-600 to-pink-500 bg-clip-text text-transparent">Emergency Services</h1><p className={`text-xl ${theme.textSecondary}`}>Quick access to emergency contacts and first aid information</p></div>


<div className="grid md:grid-cols-2 gap-6 mb-12">{emergencyContacts.map((contact, i) => { const Icon = contact.icon; return (<a key={i} href={`tel:${contact.number}`} className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border transform hover:scale-105 transition-all duration-300 cursor-pointer group`}><div className="flex items-center space-x-4"><div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${contact.color} flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300`}><Icon className="w-8 h-8 text-white"/></div><div className="flex-1"><h3 className="text-xl font-bold mb-1">{contact.name}</h3><p className="text-2xl font-mono bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{contact.number}</p></div><ChevronRight className="w-6 h-6 text-gray-400 group-hover:translate-x-2 transition-transform"/></div></a>)})}</div>


<div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border mb-8`}><h2 className="text-2xl font-bold mb-6 flex items-center"><Heart className="w-6 h-6 mr-2 text-red-500"/>First Aid Quick Reference</h2><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">{firstAidTips.map((tip, i) => { const Icon = tip.icon; return (<div key={i} className={`p-6 rounded-xl ${theme.border} border-2 hover:border-red-500 transition-all duration-300 transform hover:scale-105 cursor-pointer`}><Icon className="w-8 h-8 text-red-500 mb-3"/><h3 className="font-bold text-lg mb-2">{tip.title}</h3><p className={`text-sm ${theme.textSecondary}`}>{tip.desc}</p></div>)})}</div></div>


<div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-8 text-white text-center shadow-2xl"><Bell className="w-16 h-16 mx-auto mb-4 animate-bounce"/><h2 className="text-3xl font-bold mb-4">In Case of Emergency</h2><p className="text-lg mb-6 opacity-90">If you're experiencing a life-threatening emergency, call 911 immediately</p><a href="tel:911" className="inline-block px-12 py-4 bg-white text-red-600 rounded-xl hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-lg font-bold text-lg">Call 911 Now</a></div>
</div>
</div>
);
}
