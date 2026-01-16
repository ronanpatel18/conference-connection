"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Users, Calendar, MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function HomePage() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const updateAuth = async () => {
      const { data } = await supabase.auth.getUser();
      setIsAuthed(!!data.user);
    };

    updateAuth();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      updateAuth();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block mb-6"
            >
              <span className="px-4 py-2 rounded-full bg-badger-red/10 border border-badger-red text-badger-red text-sm font-medium">
                2026 Conference
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-gray-900"
            >
              Wisconsin Sports
              <br />
              <span className="text-badger-red">Business Conference</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto mb-10"
            >
              Connect with sports business professionals, industry leaders, and innovators. 
              Explore career opportunities and expand your network in Wisconsin&apos;s sports industry.
            </motion.p>

            {/* Conference Info Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8"
            >
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                <Calendar className="w-6 h-6 text-badger-red mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="text-gray-900 font-medium">February 27, 2026</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                <MapPin className="w-6 h-6 text-badger-red mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-1">Location</p>
                <p className="text-gray-900 font-medium">Wisconsin</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                <Users className="w-6 h-6 text-badger-red mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-1">Focus</p>
                <p className="text-gray-900 font-medium">Sports Business</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex justify-center"
            >
              <Link href={isAuthed ? "/network" : "/onboarding"}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group px-8 py-4 rounded-full bg-badger-red text-white font-semibold text-lg hover:bg-badger-darkred transition-all duration-200 flex items-center space-x-2 shadow-lg"
                >
                  <span>{isAuthed ? "View Attendees" : "Join the Network"}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 md:py-32 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
              About the <span className="text-badger-red">Project</span>
            </h2>
            <div className="text-gray-700 text-lg space-y-4 text-left">
              <p>
                This platform was created for the Wisconsin Sports Business Conference to enhance 
                networking and connections between attendees. Using AI-powered technology, we help 
                participants discover and connect with fellow professionals in the sports industry.
              </p>
              <p>
                When you register, our system automatically researches your professional background 
                and generates a rich profile that highlights your expertise, achievements, and industry 
                focus. This makes it easier for other attendees to find and connect with you based on 
                shared interests and professional goals.
              </p>
              <p>
                Browse the attendee network to discover professionals from various sectors of the 
                sports business world - from team management and marketing to analytics and sports tech. 
                Each profile is enhanced with AI-generated insights to help you make meaningful connections.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
