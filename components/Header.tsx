"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import WsbcLogo from "@/components/WsbcLogo";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/network", label: "Attendees" },
    { href: "https://www.wisconsinsbc.com/about-1", label: "About", external: true },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
              <WsbcLogo className="h-8 w-8 md:h-10 md:w-10" size={40} />
            </motion.div>
            <span className="text-base sm:text-lg md:text-xl font-bold text-badger-red leading-tight">
              Wisconsin Sports Business Conference
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-gray-700 hover:text-badger-red transition-colors duration-200 text-sm lg:text-base font-medium"
                  rel="noreferrer"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-700 hover:text-badger-red transition-colors duration-200 text-sm lg:text-base font-medium"
                >
                  {item.label}
                </Link>
              )
            ))}
            <Link href="/onboarding">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2 rounded-full bg-badger-red text-white font-semibold hover:bg-badger-darkred transition-all duration-200 shadow-md"
              >
                Register
              </motion.button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-700 p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200 bg-white"
          >
            <div className="py-4 space-y-4">
              {navItems.map((item) => (
                item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block text-gray-700 hover:text-badger-red transition-colors duration-200 py-2 font-medium"
                    rel="noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block text-gray-700 hover:text-badger-red transition-colors duration-200 py-2 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              ))}
              <Link href="/onboarding" className="w-full">
                <button className="w-full px-6 py-2 rounded-full bg-badger-red text-white font-semibold hover:bg-badger-darkred transition-colors">
                  Register
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </nav>
    </header>
  );
}