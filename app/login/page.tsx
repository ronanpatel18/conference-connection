"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      const redirect = searchParams.get("redirect") || "/network";
      router.refresh();
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
          <h1 className="text-3xl font-bold text-badger-red mb-2 text-center">Welcome back</h1>
          <p className="text-gray-600 text-center mb-8">Log in to view attendees and edit your profile.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
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
              <p className="mt-2 text-xs text-gray-500">Password must be at least 6 characters.</p>
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
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-6 text-center">
            Don&apos;t have an account?{" "}
            <Link href="/onboarding" className="text-badger-red font-semibold">
              Register here
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
