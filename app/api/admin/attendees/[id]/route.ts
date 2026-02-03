import { NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { rateLimiters } from "@/lib/rate-limit";
import { verifyAdminAccess, getAdminConfig } from "@/lib/admin";
import {
  validateBody,
  updateAttendeeSchema,
  secureJsonResponse,
  sanitizeUuid,
} from "@/lib/validation";

export const runtime = "nodejs";

function extractIdFromUrl(request: NextRequest): string | null {
  const requestUrl = new URL(request.url);
  const id = requestUrl.pathname.split("/").pop();
  return id ? sanitizeUuid(id) : null;
}

export async function PATCH(request: NextRequest) {
  // Rate limiting - admin operations
  const rateLimitResult = await rateLimiters.admin(request);
  if (rateLimitResult) return rateLimitResult;

  // Verify admin access
  const { error: authError } = await verifyAdminAccess();
  if (authError) return authError;

  const config = getAdminConfig();
  if (!config) {
    return secureJsonResponse(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Validate ID from URL
  const id = extractIdFromUrl(request);
  if (!id) {
    return secureJsonResponse(
      { success: false, error: "Invalid attendee ID" },
      { status: 400 }
    );
  }

  // Validate and sanitize input
  const [validatedData, validationError] = await validateBody(
    request,
    updateAttendeeSchema
  );
  if (validationError || !validatedData) return validationError!;

  const admin = createAdminClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Build update object with sanitized data
  const updateData: Record<string, unknown> = {};
  if (validatedData.name !== undefined) updateData.name = validatedData.name;
  if (validatedData.email !== undefined) updateData.email = validatedData.email || null;
  if (validatedData.job_title !== undefined) updateData.job_title = validatedData.job_title || null;
  if (validatedData.company !== undefined) updateData.company = validatedData.company || null;
  if (validatedData.about !== undefined) updateData.about = validatedData.about || null;
  if (validatedData.linkedin_url !== undefined) updateData.linkedin_url = validatedData.linkedin_url || null;
  if (validatedData.ai_summary !== undefined) updateData.ai_summary = validatedData.ai_summary || null;
  if (validatedData.industry_tags !== undefined) updateData.industry_tags = validatedData.industry_tags;

  const { data, error } = await admin
    .from("attendees")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Admin] Update attendee error:", error.message);
    return secureJsonResponse(
      { success: false, error: "Database error" },
      { status: 500 }
    );
  }

  return secureJsonResponse({ success: true, data });
}

export async function DELETE(request: NextRequest) {
  // Rate limiting - admin operations
  const rateLimitResult = await rateLimiters.admin(request);
  if (rateLimitResult) return rateLimitResult;

  // Verify admin access
  const { error: authError } = await verifyAdminAccess();
  if (authError) return authError;

  const config = getAdminConfig();
  if (!config) {
    return secureJsonResponse(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Validate ID from URL
  const id = extractIdFromUrl(request);
  if (!id) {
    return secureJsonResponse(
      { success: false, error: "Invalid attendee ID" },
      { status: 400 }
    );
  }

  const admin = createAdminClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Get attendee to check if linked to auth user
  const { data: attendee, error: attendeeError } = await admin
    .from("attendees")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (attendeeError) {
    console.error("[Admin] Get attendee error:", attendeeError.message);
    return secureJsonResponse(
      { success: false, error: "Database error" },
      { status: 500 }
    );
  }

  // Delete attendee profile
  const { error: deleteProfileError } = await admin
    .from("attendees")
    .delete()
    .eq("id", id);

  if (deleteProfileError) {
    console.error("[Admin] Delete attendee error:", deleteProfileError.message);
    return secureJsonResponse(
      { success: false, error: "Database error" },
      { status: 500 }
    );
  }

  // Delete associated auth user if exists
  if (attendee?.user_id) {
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      attendee.user_id
    );
    if (deleteUserError) {
      console.error("[Admin] Delete auth user error:", deleteUserError.message);
      // Don't fail the request, just log the error
    }
  }

  return secureJsonResponse({ success: true });
}
