import { NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { rateLimiters } from "@/lib/rate-limit";
import { verifyAdminAccess, getAdminConfig } from "@/lib/admin";
import { validateBody, reorderSchema, secureJsonResponse } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

  // Validate and sanitize input
  const [validatedData, validationError] = await validateBody(request, reorderSchema);
  if (validationError || !validatedData) return validationError!;

  const { items } = validatedData;

  const admin = createAdminClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Update each item's sort_order and is_pinned
  const updates = items.map((item) =>
    admin
      .from("attendees")
      .update({
        sort_order: item.sort_order,
        ...(typeof item.is_pinned === "boolean" ? { is_pinned: item.is_pinned } : {}),
      })
      .eq("id", item.id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((result) => result.error);

  if (errors.length > 0) {
    console.error("[Admin] Reorder error:", errors[0].error?.message);
    return secureJsonResponse(
      { success: false, error: "Failed to reorder" },
      { status: 500 }
    );
  }

  return secureJsonResponse({ success: true });
}
