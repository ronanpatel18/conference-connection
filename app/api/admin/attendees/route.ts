import { NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { rateLimiters } from "@/lib/rate-limit";
import { verifyAdminAccess, getAdminConfig } from "@/lib/admin";
import {
  validateBody,
  createAttendeeSchema,
  secureJsonResponse,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

  const admin = createAdminClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("attendees")
    .select("*")
    .order("is_pinned", { ascending: false, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Admin] List attendees error:", error.message);
    return secureJsonResponse(
      { success: false, error: "Database error" },
      { status: 500 }
    );
  }

  return secureJsonResponse({ success: true, data });
}

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
  const [validatedData, validationError] = await validateBody(
    request,
    createAttendeeSchema
  );
  if (validationError || !validatedData) return validationError!;

  const { name, email, job_title, company, about, linkedin_url, industry_tags } = validatedData;

  const admin = createAdminClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  let aiSummary: string | null = null;
  let enrichedTags: string[] = [];

  try {
    const enrichResponse = await fetch(`${appUrl}/api/enrich-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        job_title: job_title || undefined,
        company: company || undefined,
        linkedin_url: linkedin_url || undefined,
        about: about || undefined,
      }),
    });

    if (enrichResponse.ok) {
      const enrichData = await enrichResponse.json();
      if (enrichData?.success) {
        if (Array.isArray(enrichData.data?.summary)) {
          aiSummary = enrichData.data.summary.join("\n");
        }
        if (Array.isArray(enrichData.data?.industry_tags)) {
          enrichedTags = enrichData.data.industry_tags;
        }
      }
    }
  } catch (error) {
    console.error("[Admin] Create enrichment failed:", error);
  }

  // Use provided tags if available, otherwise use enriched tags
  const finalTags = (industry_tags && industry_tags.length > 0) ? industry_tags : enrichedTags;

  const { data, error } = await admin
    .from("attendees")
    .insert({
      name,
      email: email || null,
      job_title: job_title || null,
      company: company || null,
      linkedin_url: linkedin_url || null,
      about: about || null,
      ai_summary: aiSummary,
      industry_tags: finalTags,
    })
    .select()
    .single();

  if (error) {
    console.error("[Admin] Insert attendee error:", error.message);
    return secureJsonResponse(
      { success: false, error: "Database error" },
      { status: 500 }
    );
  }

  return secureJsonResponse({ success: true, data });
}
