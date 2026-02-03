/**
 * Admin Utilities
 *
 * Shared functions for admin authentication and authorization.
 */

import { createClient as createServerClient } from "@/utils/supabase/server";
import { secureJsonResponse } from "@/lib/validation";
import { NextResponse } from "next/server";

/**
 * Check if an email is in the admin allowlist
 */
export function isEmailAllowed(email?: string | null): boolean {
  const allowlist = process.env.ADMIN_ALLOWLIST_EMAILS || "";
  const normalized = allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  return normalized.includes(email.toLowerCase());
}

/**
 * Verify admin access and return user or error response
 */
export async function verifyAdminAccess(): Promise<
  | { user: { id: string; email: string }; error: null }
  | { user: null; error: NextResponse }
> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      error: secureJsonResponse(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (!isEmailAllowed(user.email)) {
    return {
      user: null,
      error: secureJsonResponse(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return {
    user: { id: user.id, email: user.email || "" },
    error: null,
  };
}

/**
 * Get admin Supabase client configuration
 */
export function getAdminConfig(): { url: string; serviceRoleKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}
