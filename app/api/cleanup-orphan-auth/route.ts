import { NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { rateLimiters } from "@/lib/rate-limit";
import { validateBody, cleanupOrphanAuthSchema, secureJsonResponse } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Strict rate limiting - this is a sensitive operation
    const rateLimitResult = await rateLimiters.strict(request);
    if (rateLimitResult) return rateLimitResult;

    // Validate and sanitize input
    const [validatedData, validationError] = await validateBody(request, cleanupOrphanAuthSchema);
    if (validationError || !validatedData) return validationError!;

    const { email } = validatedData;

    // Authentication check - if user is authenticated, only allow cleanup of own email
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.email?.toLowerCase() !== email.toLowerCase()) {
      return secureJsonResponse(
        { success: false, error: "Forbidden" },
        { status: 403 }
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

    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (usersError) {
      console.error("[Cleanup] Users list error:", usersError.message);
      return secureJsonResponse(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    const existingUser = usersData.users.find(
      (user) => user.email?.toLowerCase() === email
    );

    if (!existingUser) {
      // Return uniform response to prevent email enumeration
      return secureJsonResponse({ success: true, deleted: false });
    }

    const { data: attendee, error: attendeeError } = await admin
      .from("attendees")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (attendeeError) {
      console.error("[Cleanup] Attendee lookup error:", attendeeError.message);
      return secureJsonResponse(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    if (attendee) {
      // Return uniform response to prevent email enumeration
      return secureJsonResponse({
        success: true,
        deleted: false,
      });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(existingUser.id);
    if (deleteError) {
      console.error("[Cleanup] Delete error:", deleteError.message);
      return secureJsonResponse(
        { success: false, error: "Failed to cleanup" },
        { status: 500 }
      );
    }

    return secureJsonResponse({ success: true, deleted: true });
  } catch (error) {
    console.error("[Cleanup] Unexpected error:", error);
    return secureJsonResponse(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
