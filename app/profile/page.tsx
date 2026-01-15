"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import type { Attendee } from "@/types/database.types";

export default function ProfilePage() {
  const router = useRouter();
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      if (authData.user.email && attendee.email !== authData.user.email) {
        const { error: updateEmailError } = await supabase.auth.updateUser({
          email: attendee.email,
        });
        if (updateEmailError) {
          throw new Error(updateEmailError.message);
        }
      }

      const { error } = await supabase
        .from("attendees")
        .update({
          name: attendee.name,
          email: attendee.email,
          job_title: attendee.job_title,
          company: attendee.company,
          linkedin_url: attendee.linkedin_url,
          about: attendee.about,
          ai_summary: attendee.ai_summary,
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
                  value={attendee.email}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">About You</label>
              <textarea
                value={attendee.about ?? ""}
                onChange={(e) => setAttendee({ ...attendee, about: e.target.value })}
                rows={4}
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
                value={attendee.ai_summary ?? ""}
                onChange={(e) => setAttendee({ ...attendee, ai_summary: e.target.value })}
                rows={5}
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
          </form>
        </motion.div>
      </div>
    </main>
  );
}
