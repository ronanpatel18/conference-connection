"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

export default function OnboardingForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    job_title: "",
    company: "",
    linkedin_url: "",
    about: "",
  });
  const [step, setStep] = useState<"name" | "account" | "full">("name");
  const [matchedAttendeeId, setMatchedAttendeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  const createAccountSession = async (email: string, password: string) => {
    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      const isAlreadyRegistered = /already registered|user already registered/i.test(
        signUpError.message
      );
      if (!isAlreadyRegistered) {
        throw new Error(signUpError.message);
      }

      const cleanupResponse = await fetch("/api/cleanup-orphan-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const cleanupData = await cleanupResponse.json();

      if (!cleanupResponse.ok || !cleanupData?.deleted) {
        throw new Error("Email already registered. Please log in or reset your password.");
      }

      const { error: retryError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (retryError) {
        throw new Error(retryError.message);
      }
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session?.user?.id) {
      throw new Error(
        "Email already registered. Please log in or reset your password to continue."
      );
    }

    return { supabase, userId: signInData.session.user.id };
  };

  const handleNameLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setLoadingMessage("Searching for your profile...");

    try {
      if (!formData.name.trim()) {
        throw new Error("Please enter your name");
      }
      const response = await fetch("/api/onboarding/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name.trim() }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to check profile");
      }

      if (data.found && data.attendeeId) {
        setMatchedAttendeeId(data.attendeeId);
        setStep("account");
      } else {
        setMatchedAttendeeId(null);
        setStep("full");
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!formData.name.trim()) {
        throw new Error("Please enter your name");
      }
      if (!formData.email.trim()) {
        throw new Error("Please enter your email");
      }
      if (!formData.password.trim()) {
        throw new Error("Please create a password");
      }
      if (!matchedAttendeeId) {
        throw new Error("Profile not found. Please restart.");
      }

      setLoadingMessage("Creating your account...");

      await createAccountSession(formData.email, formData.password);

      setLoadingMessage("Linking your profile...");

      const claimResponse = await fetch("/api/onboarding/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeId: matchedAttendeeId,
          name: formData.name.trim(),
          email: formData.email.trim(),
        }),
      });

      const claimData = await claimResponse.json();
      if (!claimResponse.ok || !claimData.success) {
        throw new Error(claimData.error || "Failed to link profile");
      }

      router.push("/profile?from=onboarding");
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleFullSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!formData.name.trim()) {
        throw new Error("Please enter your name");
      }
      if (!formData.email.trim()) {
        throw new Error("Please enter your email");
      }
      if (!formData.password.trim()) {
        throw new Error("Please create a password");
      }

      setLoadingMessage("Creating your account...");

      const { supabase, userId } = await createAccountSession(
        formData.email,
        formData.password
      );

      setLoadingMessage("AI is scanning the web for you...");

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
          about: formData.about || undefined,
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

      const aiSummary = enrichData.data.summary.join("\n");

      const { error: supabaseError } = await supabase
        .from("attendees")
        .upsert(
          {
            user_id: userId,
            name: formData.name,
            email: formData.email,
            job_title: formData.job_title || null,
            company: formData.company || null,
            linkedin_url: formData.linkedin_url || null,
            about: formData.about || null,
            ai_summary: aiSummary,
            industry_tags: enrichData.data.industry_tags || [],
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (supabaseError) {
        console.error("Supabase error:", supabaseError);
        throw new Error(supabaseError.message);
      }

      setLoadingMessage("Profile created!");

      setTimeout(() => {
        router.push("/network");
      }, 1000);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
      setLoadingMessage("");
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
                {step === "name" ? "Find Your Profile" : "Join the Network"}
              </h2>
              <p className="text-gray-600 text-sm">
                {step === "name"
                  ? "Start with your name to continue"
                  : "Let AI enhance your conference profile"}
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={
                step === "name"
                  ? handleNameLookup
                  : step === "account"
                  ? handleAccountSubmit
                  : handleFullSubmit
              }
              className="space-y-5"
            >
              {step === "account" ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-700">
                    Continuing as <span className="font-semibold">{formData.name}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep("name")}
                    className="text-xs font-semibold text-badger-red"
                  >
                    Edit name
                  </button>
                </div>
              ) : (
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
                  <p className="mt-3 text-center text-sm text-gray-600">
                    Already created your profile?{" "}
                    <Link href="/login" className="text-badger-red hover:underline font-medium">
                      Log in
                    </Link>
                  </p>
                </div>
              )}

              {step !== "name" && (
                <>
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
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Create Password *
                      </label>
                      <span className="text-xs text-gray-500">Min 6 characters</span>
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="••••••••"
                      minLength={6}
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
                </>
              )}

              {step === "full" && (
                <>
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
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label
                        htmlFor="about"
                        className="block text-sm font-medium text-gray-700"
                      >
                        About You (optional)
                      </label>
                      <span className="text-xs text-gray-500 italic">Private - not shown publicly</span>
                    </div>
                    <textarea
                      id="about"
                      value={formData.about}
                      onChange={(e) =>
                        setFormData({ ...formData, about: e.target.value })
                      }
                      placeholder="Share 2-3 sentences about who you are and what you do."
                      disabled={isLoading}
                      rows={4}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl",
                        "bg-gray-50 border border-gray-300",
                        "text-gray-900 placeholder:text-gray-400",
                        "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                        "transition-all duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "resize-none"
                      )}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      This helps AI create a better profile summary. Not required and never shown publicly.
                    </p>
                  </div>
                </>
              )}

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
                    <span>
                      {step === "name"
                        ? "Continue"
                        : step === "account"
                        ? "Create Account"
                        : "Start Connecting!"}
                    </span>
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
