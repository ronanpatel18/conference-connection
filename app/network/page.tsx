"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Users, Search, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Attendee } from "@/types/database.types";
import AttendeeCard from "@/components/AttendeeCard";
import { cn } from "@/lib/utils";

export default function NetworkPage() {
  const router = useRouter();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [allIndustries, setAllIndustries] = useState<string[]>([]);

  useEffect(() => {
    loadAttendees();
  }, []);

  useEffect(() => {
    filterAttendees();
  }, [attendees, searchQuery, selectedIndustry]);

  const loadAttendees = async () => {
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push("/login");
        return;
      }
      const { data, error } = await supabase
        .from("attendees")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAttendees(data || []);
      
      // Extract all unique industry tags
      const industries = new Set<string>();
      data?.forEach((attendee) => {
        attendee.industry_tags?.forEach((tag: string) => industries.add(tag));
      });
      setAllIndustries(Array.from(industries).sort());
    } catch (err) {
      console.error("Error loading attendees:", err);
      setError(err instanceof Error ? err.message : "Failed to load attendees");
    } finally {
      setIsLoading(false);
    }
  };

  const filterAttendees = () => {
    let filtered = [...attendees];

    // Filter by search query (name, company, job title)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.company?.toLowerCase().includes(query) ||
          a.job_title?.toLowerCase().includes(query)
      );
    }

    // Filter by selected industry
    if (selectedIndustry) {
      filtered = filtered.filter((a) =>
        a.industry_tags?.includes(selectedIndustry)
      );
    }

    setFilteredAttendees(filtered);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-badger-red animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadAttendees}
            className="px-6 py-2 rounded-full bg-badger-red text-white hover:bg-badger-darkred transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 bg-white">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Users className="w-8 h-8 text-badger-red" />
            <h1 className="text-4xl md:text-5xl font-bold text-badger-red">
              Conference Network
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Connect with {attendees.length} professionals at the conference
          </p>
        </motion.div>

        {/* Search and Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          {/* Search input */}
          <div className="relative max-w-2xl mx-auto mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, company, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-12 pr-12 py-4 rounded-2xl",
                "bg-gray-50 border border-gray-300",
                "text-gray-900 placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                "transition-all duration-200"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-badger-red transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Industry filter tags */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedIndustry(null)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                selectedIndustry === null
                  ? "bg-badger-red text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
              )}
            >
              All Industries
            </button>
            {allIndustries.map((industry) => (
              <button
                key={industry}
                onClick={() => setSelectedIndustry(industry)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  selectedIndustry === industry
                    ? "bg-badger-red text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
                )}
              >
                {industry}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Results count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <p className="text-gray-600 text-sm font-medium">
            {filteredAttendees.length === attendees.length
              ? `Showing all ${attendees.length} attendees`
              : `Found ${filteredAttendees.length} of ${attendees.length} attendees`}
          </p>
        </motion.div>

        {/* Attendees Bento Grid */}
        {filteredAttendees.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 mb-4">
              {attendees.length === 0
                ? "No attendees yet. Be the first to join!"
                : "No attendees match your search."}
            </p>
            {attendees.length === 0 && (
              <a
                href="/onboarding"
                className="inline-block px-6 py-3 rounded-full bg-badger-red text-white font-semibold hover:bg-badger-darkred shadow-md hover:shadow-lg transition-all"
              >
                Join Network
              </a>
            )}
          </div>
        ) : (
          <AnimatePresence mode="sync">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
              {filteredAttendees.map((attendee, index) => (
                <AttendeeCard
                  key={attendee.id}
                  attendee={attendee}
                  index={index}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
