"use client";

import React, { useEffect, useState } from "react";
import Navbar from "./navbar";
import { ThemeProvider } from "./ThemeProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [currentPage, setCurrentPage] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <ThemeProvider>
      <Navbar
        isDark={isDark}
        setIsDark={setIsDark}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        scrollY={scrollY}
      />

      <div className="pt-16">{children}</div>
    </ThemeProvider>
  );
}
