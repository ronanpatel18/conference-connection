"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Save, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import type { Attendee } from "@/types/database.types";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFromOnboarding = searchParams.get("from") === "onboarding";
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [aiSummaryText, setAiSummaryText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("attendees")
        .select("*")
        .eq("user_id", authData.user.id)
        .single();

      if (error) {
        setError(error.message);
      } else {
        setAttendee(data);
        const bullets = (data.ai_summary || "")
          .split("\n")
          .map((line: string) => line.trim())
          .filter(Boolean)
          .map((line: string) => (line.startsWith("•") ? line : `• ${line}`));
        setAiSummaryText(bullets.join("\n"));
      }
      setIsLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendee) return;

    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push("/login");
        return;
      }

      // Update auth email if changed
      if (authData.user.email && attendee.email && attendee.email !== authData.user.email) {
        const { error: updateEmailError } = await supabase.auth.updateUser({
          email: attendee.email,
        });
        if (updateEmailError) {
          throw new Error(updateEmailError.message);
        }
      }

      const normalizedSummary = aiSummaryText
        .split("\n")
        .map((line) => line.replace(/^•\s*/, "").trim())
        .filter(Boolean)
        .join("\n");

      const { error } = await supabase
        .from("attendees")
        .update({
          name: attendee.name,
          email: attendee.email || null,
          job_title: attendee.job_title,
          company: attendee.company,
          linkedin_url: attendee.linkedin_url,
          about: attendee.about,
          ai_summary: normalizedSummary,
          industry_tags: attendee.industry_tags,
        })
        .eq("user_id", authData.user.id);

      if (error) {
        throw new Error(error.message);
      }

      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!attendee) return;
    setError("");
    setSuccess("");
    setIsRegenerating(true);

    try {
      const response = await fetch("/api/enrich-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: attendee.name,
          job_title: attendee.job_title || undefined,
          company: attendee.company || undefined,
          linkedin_url: attendee.linkedin_url || undefined,
          about: attendee.about || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to regenerate profile");
      }

      const summaryLines = Array.isArray(data.data?.summary) ? data.data.summary : [];
      const bullets = summaryLines
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string) => (line.startsWith("•") ? line : `• ${line}`));

      setAiSummaryText(bullets.join("\n"));
      setAttendee({
        ...attendee,
        ai_summary: summaryLines.join("\n"),
        industry_tags: data.data?.industry_tags || [],
      });

      setSuccess("AI summary regenerated. Review and save your changes.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate profile");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteProfile = async () => {
    const confirmed = window.confirm(
      "This will permanently delete your attendee profile. This cannot be undone. Continue?"
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setIsDeleting(true);

    try {
      const response = await fetch("/api/delete-account", {
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete profile");
      }

      // Sign out locally — the auth user is already deleted server-side
      // by the database trigger, so ignore any sign-out errors
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete profile");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-badger-red animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!attendee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <p className="text-gray-600">Profile not found.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 bg-white">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl"
        >
          <h1 className="text-3xl font-bold text-badger-red mb-2">Edit your profile</h1>
          <p className="text-gray-600 mb-8">
            Update your details and fine-tune the AI summary shown to attendees.
          </p>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={attendee.name}
                  onChange={(e) => setAttendee({ ...attendee, name: e.target.value })}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-gray-50 border border-gray-300",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                    "transition-all duration-200"
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={attendee.email ?? ""}
                  onChange={(e) => setAttendee({ ...attendee, email: e.target.value })}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-gray-50 border border-gray-300",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                    "transition-all duration-200"
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                <input
                  type="text"
                  value={attendee.job_title ?? ""}
                  onChange={(e) => setAttendee({ ...attendee, job_title: e.target.value })}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-gray-50 border border-gray-300",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                    "transition-all duration-200"
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                <input
                  type="text"
                  value={attendee.company ?? ""}
                  onChange={(e) => setAttendee({ ...attendee, company: e.target.value })}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-gray-50 border border-gray-300",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                    "transition-all duration-200"
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
              <input
                type="url"
                value={attendee.linkedin_url ?? ""}
                onChange={(e) => setAttendee({ ...attendee, linkedin_url: e.target.value })}
                className={cn(
                  "w-full px-4 py-3 rounded-xl",
                  "bg-gray-50 border border-gray-300",
                  "text-gray-900 placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                  "transition-all duration-200"
                )}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">About You</label>
                <span className="text-xs text-gray-500 italic">(Private - not shown publicly)</span>
              </div>
              <textarea
                value={attendee.about ?? ""}
                onChange={(e) => setAttendee({ ...attendee, about: e.target.value })}
                rows={4}
                placeholder="Optional: Add details about yourself to help our AI create a better profile summary. After adding, click 'Regenerate' and then 'Save' to update your public profile."
                className={cn(
                  "w-full px-4 py-3 rounded-xl",
                  "bg-gray-50 border border-gray-300",
                  "text-gray-900 placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                  "transition-all duration-200",
                  "resize-none"
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Summary</label>
              <textarea
                value={aiSummaryText}
                onChange={(e) => setAiSummaryText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const textarea = e.currentTarget;
                  const { selectionStart, selectionEnd } = textarea;
                  const prefix = aiSummaryText.length === 0 ? "• " : "\n• ";
                  const nextValue =
                    aiSummaryText.slice(0, selectionStart) +
                    prefix +
                    aiSummaryText.slice(selectionEnd);
                  setAiSummaryText(nextValue);
                  requestAnimationFrame(() => {
                    const nextPos = selectionStart + prefix.length;
                    textarea.selectionStart = nextPos;
                    textarea.selectionEnd = nextPos;
                  });
                }}
                rows={6}
                className={cn(
                  "w-full px-4 py-3 rounded-xl",
                  "bg-gray-50 border border-gray-300",
                  "text-gray-900 placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                  "transition-all duration-200",
                  "resize-none"
                )}
              />
              <p className="mt-2 text-xs text-gray-500">Use one bullet per line. Bullets are shown on the attendee card.</p>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="mt-3 inline-flex items-center px-4 py-2 rounded-full border border-badger-red text-badger-red text-sm font-semibold hover:bg-badger-red hover:text-white transition-all duration-200"
              >
                {isRegenerating ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Regenerating...
                  </span>
                ) : (
                  "Regenerate AI Summary"
                )}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Industry Tags (comma separated)</label>
              <input
                type="text"
                value={attendee.industry_tags?.join(", ") ?? ""}
                onChange={(e) =>
                  setAttendee({
                    ...attendee,
                    industry_tags: e.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
                className={cn(
                  "w-full px-4 py-3 rounded-xl",
                  "bg-gray-50 border border-gray-300",
                  "text-gray-900 placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                  "transition-all duration-200"
                )}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-6 py-3 rounded-full bg-badger-red text-white font-semibold hover:bg-badger-darkred transition-all duration-200 shadow-md"
              >
                {isSaving ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </span>
                )}
              </button>

              {isFromOnboarding && (
                <button
                  type="button"
                  onClick={() => router.push("/network")}
                  className="inline-flex items-center px-6 py-3 rounded-full bg-badger-red text-white font-semibold hover:bg-badger-darkred transition-all duration-200 shadow-md"
                >
                  <span className="inline-flex items-center">
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </span>
                </button>
              )}
            </div>
          </form>

          <div className="mt-10 border-t border-gray-200 pt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete profile</h2>
            <p className="text-sm text-gray-600 mb-4">
              This permanently removes your attendee profile from the network.
            </p>
            <button
              type="button"
              onClick={handleDeleteProfile}
              disabled={isDeleting}
              className="inline-flex items-center px-5 py-2.5 rounded-full border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-all duration-200"
            >
              {isDeleting ? (
                <span className="inline-flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </span>
              ) : (
                "Delete Profile"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-badger-red animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
