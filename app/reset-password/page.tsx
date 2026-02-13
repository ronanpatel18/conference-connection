"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, CheckCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl"
        >
          {success ? (
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Password updated
              </h1>
              <p className="text-gray-600 mb-6">
                Your password has been reset successfully.
              </p>
              <Link
                href="/network"
                className="inline-block px-6 py-3 rounded-full bg-badger-red text-white font-semibold hover:bg-badger-darkred transition-all duration-200 shadow-md"
              >
                Continue to Network
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-badger-red mb-2 text-center">
                Reset password
              </h1>
              <p className="text-gray-600 text-center mb-8">
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                  <p className="mt-2 text-xs text-gray-500">
                    Must be at least 6 characters.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
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

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 rounded-full bg-badger-red text-white font-semibold hover:bg-badger-darkred transition-all duration-200 shadow-md"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Updating...
                    </span>
                  ) : (
                    "Reset password"
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </main>
  );
}
