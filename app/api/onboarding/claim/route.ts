import { NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { rateLimiters } from "@/lib/rate-limit";
import { validateBody, claimSchema, secureJsonResponse } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Rate limiting - strict for sensitive operations
  const rateLimitResult = await rateLimiters.strict(request);
  if (rateLimitResult) return rateLimitResult;

  // Authentication check
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return secureJsonResponse({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return secureJsonResponse(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Validate and sanitize input
  const [validatedData, validationError] = await validateBody(request, claimSchema);
  if (validationError || !validatedData) return validationError!;

  const { attendeeId, name, email } = validatedData;

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: attendee, error } = await admin
    .from("attendees")
    .update({ user_id: user.id, email, name })
    .eq("id", attendeeId)
    .is("user_id", null)
    .ilike("name", name)
    .select()
    .single();

  if (error) {
    console.error("[Claim] Database error:", error.message);
    return secureJsonResponse(
      { success: false, error: "Database error" },
      { status: 500 }
    );
  }

  if (!attendee) {
    return secureJsonResponse(
      { success: false, error: "Profile not available" },
      { status: 404 }
    );
  }

  return secureJsonResponse({ success: true, data: attendee });
}
