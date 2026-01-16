"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, X, User, LogOut, Pencil } from "lucide-react";
import WsbcLogo from "@/components/WsbcLogo";
import { createClient } from "@/utils/supabase/client";

export default function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setIsAuthed(false);
        setUserName(null);
        return;
      }

      setIsAuthed(true);
      const { data: attendee } = await supabase
        .from("attendees")
        .select("name")
        .eq("user_id", data.user.id)
        .maybeSingle();
      setUserName(attendee?.name ?? data.user.email ?? null);
    };

    fetchUser();
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuOpen) return;
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen]);

  const profileInitial = useMemo(() => {
    if (!userName) return "U";
    return userName.trim()[0]?.toUpperCase() ?? "U";
  }, [userName]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAuthed(false);
    setUserName(null);
    setProfileMenuOpen(false);
    router.push("/login");
  };

  const navItems = [
    { href: "/network", label: "Attendees" },
    { href: "/#about", label: "About" },
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
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-700 hover:text-badger-red transition-colors duration-200 text-sm lg:text-base font-medium"
              >
                {item.label}
              </Link>
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
            {isAuthed ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="flex items-center space-x-2"
                >
                  <div className="w-9 h-9 rounded-full bg-badger-red text-white flex items-center justify-center font-semibold">
                    {profileInitial}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Profile</span>
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 font-medium hover:text-badger-red hover:border-badger-red transition-colors"
                >
                  Login
                </motion.button>
              </Link>
            )}
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
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-gray-700 hover:text-badger-red transition-colors duration-200 py-2 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/onboarding" className="w-full">
                <button className="w-full px-6 py-2 rounded-full bg-badger-red text-white font-semibold hover:bg-badger-darkred transition-colors">
                  Register
                </button>
              </Link>
              {isAuthed ? (
                <div className="space-y-2">
                  <Link
                    href="/profile"
                    className="w-full flex items-center justify-center px-6 py-2 rounded-full border border-gray-300 text-gray-700 font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-6 py-2 rounded-full border border-red-200 text-red-600 font-semibold"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </button>
                </div>
              ) : (
                <Link href="/login" className="w-full">
                  <button className="w-full px-6 py-2 rounded-full border border-gray-300 text-gray-700 font-semibold hover:text-badger-red hover:border-badger-red transition-colors">
                    Login
                  </button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </nav>
    </header>
  );
}