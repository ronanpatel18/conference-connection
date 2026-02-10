import { NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { rateLimiters } from "@/lib/rate-limit";
import { validateBody, lookupSchema, secureJsonResponse } from "@/lib/validation";

export const runtime = "nodejs";

/** Escape special characters for ILIKE patterns */
function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}

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

  // Step 1: Try exact case-insensitive match
  const { data: attendees, error } = await admin
    .from("attendees")
    .select("id, name")
    .ilike("name", escapeLikePattern(name))
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
  if (attendee) {
    return secureJsonResponse({ success: true, found: true, attendeeId: attendee.id });
  }

  // Step 2: Fuzzy match fallback — match last name + first 2 letters of first name
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length >= 2) {
    const inputFirst = nameParts[0].toLowerCase();
    const inputLast = nameParts[nameParts.length - 1].toLowerCase();

    if (inputFirst.length >= 2) {
      const escapedLast = escapeLikePattern(inputLast);
      const { data: candidates, error: fuzzyError } = await admin
        .from("attendees")
        .select("id, name")
        .ilike("name", `% ${escapedLast}`)
        .is("user_id", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (fuzzyError) {
        console.error("[Lookup] Fuzzy search error:", fuzzyError.message);
      } else if (candidates) {
        const fuzzyMatch = candidates.find((candidate) => {
          const candidateParts = candidate.name.trim().split(/\s+/);
          if (candidateParts.length < 2) return false;
          const candidateFirst = candidateParts[0].toLowerCase();
          return (
            candidateFirst.length >= 2 &&
            candidateFirst.substring(0, 2) === inputFirst.substring(0, 2)
          );
        });

        if (fuzzyMatch) {
          return secureJsonResponse({
            success: true,
            found: true,
            attendeeId: fuzzyMatch.id,
          });
        }
      }
    }
  }

  return secureJsonResponse({ success: true, found: false });
}
