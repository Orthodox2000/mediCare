import React from 'react';
import { Phone, Mail, MapPin, Stethoscope } from 'lucide-react';
import { ThemeContext } from './ThemeProvider';


interface FooterProps { setCurrentPage: (p: string) => void }


const Footer: React.FC<FooterProps> = ({ setCurrentPage }) => {
    const theme = React.useContext(ThemeContext)!;
    return (
        <footer className={`${theme.cardBg} ${theme.border} border-t mt-20`}>
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${theme.accent} flex items-center justify-center`}><Stethoscope className="w-6 h-6 text-white" /></div>
                            <span className="text-xl font-bold">MediCare</span>
                        </div>
                        <p className={theme.textSecondary}>Your trusted healthcare companion for better health management.</p>
                    </div>


                    <div>
                        <h3 className="font-bold mb-4">Quick Links</h3>
                        <div className="space-y-2">
                            {['home', 'appointments', 'doctors'].map(page => (
                                <button key={page} onClick={() => setCurrentPage(page)} className={`block ${theme.textSecondary} hover:text-blue-500 transition-colors capitalize`}>{page}</button>
                            ))}
                        </div>
                    </div>


                    <div>
                        <h3 className="font-bold mb-4">Services</h3>
                        <div className="space-y-2">
                            <p className={theme.textSecondary}>Health Tracking</p>
                            <p className={theme.textSecondary}>Emergency Care</p>
                            <p className={theme.textSecondary}>Telemedicine</p>
                        </div>
                    </div>


                    <div>
                        <h3 className="font-bold mb-4">Contact</h3>
                        <div className="space-y-3">
                            <div className={`flex items-center space-x-2 ${theme.textSecondary}`}><Phone className="w-4 h-4" /><span>+1-555-MEDICARE</span></div>
                            <div className={`flex items-center space-x-2 ${theme.textSecondary}`}><Mail className="w-4 h-4" /><span>support@medicare.com</span></div>
                            <div className={`flex items-center space-x-2 ${theme.textSecondary}`}><MapPin className="w-4 h-4" /><span>123 Health St, Medical City</span></div>
                        </div>
                    </div>
                </div>


                <div className={`pt-8 border-t ${theme.border} text-center ${theme.textSecondary}`}>
                    <p>© 2024 MediCare. All rights reserved. Built with care for your health.</p>
                </div>
            </div>
        </footer>
    );
};


export default Footer;