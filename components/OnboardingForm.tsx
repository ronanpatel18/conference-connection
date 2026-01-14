"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

export default function OnboardingForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    job_title: "",
    company: "",
    linkedin_url: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Step 1: Validate input
      if (!formData.name.trim()) {
        throw new Error("Please enter your name");
      }
      if (!formData.email.trim()) {
        throw new Error("Please enter your email");
      }

      setLoadingMessage("AI is scanning the web for you...");

      // Step 2: Call the enrich-profile API
      const enrichResponse = await fetch("/api/enrich-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          job_title: formData.job_title || undefined,
          company: formData.company || undefined,
          linkedin_url: formData.linkedin_url || undefined,
        }),
      });

      if (!enrichResponse.ok) {
        throw new Error("Failed to enrich profile");
      }

      const enrichData = await enrichResponse.json();

      if (!enrichData.success) {
        throw new Error(enrichData.error || "Failed to enrich profile");
      }

      setLoadingMessage("Saving your profile...");

      // Step 3: Save to Supabase
      const supabase = createClient();

      // Combine summary bullets into a single text
      const aiSummary = enrichData.data.summary.join("\n");

      const { data: insertedData, error: supabaseError } = await supabase
        .from("attendees")
        .insert({
          name: formData.name,
          email: formData.email,
          job_title: formData.job_title || null,
          company: formData.company || null,
          linkedin_url: formData.linkedin_url || null,
          ai_summary: aiSummary,
          industry_tags: enrichData.data.industry_tags || [],
        })
        .select()
        .single();

      if (supabaseError) {
        console.error("Supabase error:", supabaseError);
        throw new Error(supabaseError.message);
      }

      setLoadingMessage("Profile created!");

      // Step 4: Redirect to network page
      setTimeout(() => {
        router.push("/network");
      }, 1000);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-gray-100">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="relative bg-white border border-gray-200 rounded-3xl p-8 shadow-xl">

          <div className="relative">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-4"
              >
                <Sparkles className="w-12 h-12 text-badger-red" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-2 text-badger-red">
                Join the Network
              </h2>
              <p className="text-gray-600 text-sm">
                Let AI enhance your conference profile
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name input */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Full Name *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Jane Doe"
                  disabled={isLoading}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-gray-50 border border-gray-300",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                    "transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                />
              </div>

              {/* Job Title input */}
              <div>
                <label
                  htmlFor="job_title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Job Title
                </label>
                <input
                  id="job_title"
                  type="text"
                  value={formData.job_title}
                  onChange={(e) =>
                    setFormData({ ...formData, job_title: e.target.value })
                  }
                  placeholder="Senior Manager"
                  disabled={isLoading}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-gray-50 border border-gray-300",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                    "transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                />
              </div>

              {/* Company input */}
              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Company
                </label>
                <input
                  id="company"
                  type="text"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  placeholder="Acme Corp"
                  disabled={isLoading}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-gray-50 border border-gray-300",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                    "transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                />
              </div>
              {/* Email input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="jane@example.com"
                  disabled={isLoading}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-gray-50 border border-gray-300",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                    "transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                />
              </div>
              {/* LinkedIn URL input */}
              <div>
                <label
                  htmlFor="linkedin"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  LinkedIn Profile
                </label>
                <input
                  id="linkedin"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedin_url: e.target.value })
                  }
                  placeholder="https://linkedin.com/in/janedoe"
                  disabled={isLoading}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-gray-50 border border-gray-300",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                    "transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                />
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Loading message */}
              {isLoading && loadingMessage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center space-x-2 text-badger-red text-sm font-medium"
                >
                  {loadingMessage.includes("created") ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <span>{loadingMessage}</span>
                </motion.div>
              )}

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold text-white",
                  "bg-badger-red hover:bg-badger-darkred",
                  "shadow-md hover:shadow-lg",
                  "transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center space-x-2"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Start Connecting!</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Footer note */}
            <p className="text-center text-xs text-gray-600 mt-6">
              Your profile will be visible to other attendees
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
