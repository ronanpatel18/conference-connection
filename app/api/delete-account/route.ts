import { NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { rateLimiters } from "@/lib/rate-limit";
import { secureJsonResponse } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for destructive operations
    const rateLimitResult = await rateLimiters.strict(request);
    if (rateLimitResult) return rateLimitResult;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return secureJsonResponse(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      return secureJsonResponse(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const admin = createAdminClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Delete attendee profile — the database trigger
    // (delete_auth_user_on_attendee_delete) automatically removes
    // the auth user when the attendee row is deleted.
    const { error: deleteProfileError } = await admin
      .from("attendees")
      .delete()
      .eq("user_id", user.id);

    if (deleteProfileError) {
      console.error("[DeleteAccount] Profile delete error:", deleteProfileError.message);
      return secureJsonResponse(
        { success: false, error: "Failed to delete profile" },
        { status: 500 }
      );
    }

    return secureJsonResponse({ success: true });
  } catch (error) {
    console.error("[DeleteAccount] Unexpected error:", error);
    return secureJsonResponse(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
