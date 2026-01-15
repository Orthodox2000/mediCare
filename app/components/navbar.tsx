"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun,
  Moon,
  Menu,
  X,
  Stethoscope,
  LogOut,
} from "lucide-react";
import { Theme, ThemeContext } from "./ThemeProvider";
import AuthModal from "@/app/components/AuthModal";
import { useAuth } from "@/app/lib/AuthContext";
import { logoutUser } from "@/app/lib/firebaseAuth";

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
}) => {
  const theme = React.useContext(ThemeContext) as Theme;
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const [authOpen, setAuthOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "User";

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${
          isDark
            ? "bg-gray-900/90 backdrop-blur shadow-lg"
            : "bg-white/90 backdrop-blur shadow-lg"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${theme.accent}
                flex items-center justify-center`}
              >
                <Stethoscope className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                MediCare
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg transition
                    ${
                      pathname === item.href
                        ? `bg-gradient-to-r ${theme.accent} text-white`
                        : isDark
                        ? "text-white hover:bg-gray-800"
                        : "text-black hover:bg-gray-200"
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3 relative">

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg border hover:scale-110 transition"
              >
                {isDark ? <Sun /> : <Moon />}
              </button>

              {/* AUTH */}
              {!loading && (
                <>
                  {!user ? (
                    <button
                      onClick={() => setAuthOpen(true)}
                      className="px-6 py-2 rounded-lg bg-gradient-to-r
                      from-blue-600 to-cyan-500 text-white
                      hover:scale-105 transition shadow"
                    >
                      Login / Signup
                    </button>
                  ) : (
                    <div className="relative">
                      {/* Avatar */}
                      <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className="w-10 h-10 rounded-full bg-gradient-to-r
                        from-blue-600 to-cyan-500 text-white font-bold"
                      >
                        {displayName[0].toUpperCase()}
                      </button>

                      {/* Dropdown */}
                      {profileOpen && (
                        <div
                          className="absolute right-0 mt-2 w-56 bg-white
                          rounded-xl shadow-lg border z-50"
                        >
                          <div className="px-4 py-3 border-b">
                            <p className="font-semibold">{displayName}</p>
                            <p className="text-sm text-gray-500">
                              {user.email}
                            </p>
                          </div>

                          <button
                            onClick={async () => {
                              await logoutUser();
                              setProfileOpen(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-2
                            text-red-600 hover:bg-red-50 transition"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Mobile Menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg"
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-3 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg hover:bg-gray-200"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* AUTH MODAL (OUTSIDE NAV) */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navbar;
