"use client";

import React, { useEffect, useState } from 'react';

export interface Theme {
  isDark: boolean;
  bg: string;
  cardBg: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  border: string;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeContext = React.createContext<Theme | undefined>(undefined);

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // Inject minimal animations CSS once on client
    const styleId = 'medicare-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px);} to { opacity:1; transform: translateY(0);} }
        @keyframes blob { 0%,100%{ transform: translate(0,0) scale(1);} 25%{ transform: translate(20px,-20px) scale(1.1);} 50%{ transform: translate(-20px,20px) scale(0.9);} 75%{ transform: translate(20px,20px) scale(1.05);} }
        @keyframes gradient { 0%,100%{background-position:0% 50%;} 50%{background-position:100% 50%;} }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        .animate-fadeInUp { animation: fadeInUp 0.8s ease-out; }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-gradient { background-size: 200% 200%; animation: gradient 3s ease infinite; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const theme: Theme = {
    isDark,
    bg: isDark ? 'bg-gray-500' : 'bg-gray-50',
    cardBg: isDark ? 'bg-gray-200' : 'bg-white',
    text: isDark ? 'text-gray-100' : 'text-gray-800',
    textSecondary: isDark ? 'text-gray-100' : 'text-gray-900',
    accent: 'from-blue-600 to-cyan-500',
    accentHover: 'from-blue-700 to-cyan-600',
    border: isDark ? 'border-gray-700' : 'border-gray-200'
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
