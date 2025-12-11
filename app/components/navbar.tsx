"use client";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Menu, X, Stethoscope } from "lucide-react";
import { Theme, ThemeContext } from "./ThemeProvider";

interface NavbarProps {
    isDark: boolean;
    setIsDark: (v: boolean) => void;
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (v: boolean) => void;
    scrollY: number;
}

const navItems = [
    { href: "/", label: "Home" },
    { href: "/appointments", label: "Appointments" },
    { href: "/doctors", label: "Doctors" },
    { href: "/health-tracker", label: "Health Tracker" },
    { href: "/emergency", label: "Emergency" },
];

const Navbar: React.FC<NavbarProps> = ({
    isDark,
    setIsDark,
    mobileMenuOpen,
    setMobileMenuOpen,
    scrollY,
}) => {
    const theme = React.useContext(ThemeContext) as Theme;
    const pathname = usePathname();
    const isScrolled = scrollY > 20;

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300  ${isDark
                ? 'bg-gray-900 shadow-lg backdrop-blur-md bg-opacity-90'
                : 'bg-white shadow-lg backdrop-blur-md bg-opacity-90'
                }

}
      }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">

                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div
                            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${theme.accent} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}
                        >
                            <Stethoscope className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                            MediCare
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-4 py-2 m-2 rounded-lg transition-all duration-300 ${isActive
                                        ? `bg-gradient-to-r ${theme.accent} text-white shadow-lg transform scale-105`
                                        : `${theme.textSecondary} hover:${isActive ? 'text-blue' : 'text-black'} hover:bg-opacity-10 hover:bg-gray-200`

                                        }
                                            ${isDark ?
                                            'text-white hover:text-black' : 'text-black'}`

                                    }
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Mode + menu */}
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className={`p-2 rounded-lg ${theme.cardBg} ${theme.border} border hover:scale-110 transition-all duration-300 hover:shadow-lg`}
                        >
                            {isDark ? (
                                <Sun className="w-5 h-5 text-black" />
                            ) : (
                                <Moon className="w-5 h-5 text-black" />
                            )}
                        </button>
                        <ClerkProvider>
                        <div className="  md:block px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:from-blue-700 hover:to-cyan-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                            <SignedOut>
                            <SignInButton />
                        </SignedOut>

                        <SignedIn>
                            <UserButton />
                        </SignedIn>
                    </div>
                    </ClerkProvider>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </div>
        </div>

            {/* Mobile Menu */ }
    {
        mobileMenuOpen && (
            <div
                className={`md:hidden ${theme.cardBg} border-t ${theme.border} animate-fadeIn`}
            >
                <div className="px-4 py-3 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block w-full px-4 py-3 rounded-lg transition-all duration-300 ${isActive
                                    ? `bg-gradient-to-r ${theme.accent} text-white`
                                    : `${theme.textSecondary} hover:${theme.text} hover:bg-opacity-10 hover:bg-gray-500`
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        )
    }
        </nav >
    );
};

export default Navbar;
