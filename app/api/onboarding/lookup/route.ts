import { NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { rateLimiters } from "@/lib/rate-limit";
import { validateBody, lookupSchema, secureJsonResponse } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Rate limiting - lookup operations
  const rateLimitResult = await rateLimiters.lookup(request);
  if (rateLimitResult) return rateLimitResult;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return secureJsonResponse(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Validate and sanitize input
  const [validatedData, validationError] = await validateBody(request, lookupSchema);
  if (validationError || !validatedData) return validationError!;

  const { name } = validatedData;

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: attendees, error } = await admin
    .from("attendees")
    .select("id, name")
    .ilike("name", name)
    .is("user_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[Lookup] Database error:", error.message);
    return secureJsonResponse(
      { success: false, error: "Database error" },
      { status: 500 }
    );
  }

  const attendee = attendees?.[0];
  if (!attendee) {
    return secureJsonResponse({ success: true, found: false });
  }

  return secureJsonResponse({ success: true, found: true, attendeeId: attendee.id });
}
