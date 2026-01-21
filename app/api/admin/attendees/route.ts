import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

function isEmailAllowed(email?: string | null) {
  const allowlist = process.env.ADMIN_ALLOWLIST_EMAILS || "";
  const normalized = allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  return normalized.includes(email.toLowerCase());
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isEmailAllowed(user?.email ?? null)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY server env var" },
      { status: 500 }
    );
  }

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("attendees")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isEmailAllowed(user?.email ?? null)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY server env var" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  let aiSummary: string | null = null;
  let industryTags: string[] = Array.isArray(body?.industry_tags) ? body.industry_tags : [];

  try {
    const enrichResponse = await fetch(`${origin}/api/enrich-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        job_title: body?.job_title || undefined,
        company: body?.company || undefined,
        linkedin_url: body?.linkedin_url || undefined,
        about: body?.about || undefined,
      }),
    });

    if (enrichResponse.ok) {
      const enrichData = await enrichResponse.json();
      if (enrichData?.success) {
        if (Array.isArray(enrichData.data?.summary)) {
          aiSummary = enrichData.data.summary.join("\n");
        }
        if (Array.isArray(enrichData.data?.industry_tags)) {
          industryTags = enrichData.data.industry_tags;
        }
      }
    }
  } catch (error) {
    console.error("Admin create enrichment failed:", error);
  }

  const { data, error } = await admin
    .from("attendees")
    .insert({
      name,
      email: email || null,
      job_title: body?.job_title || null,
      company: body?.company || null,
      linkedin_url: body?.linkedin_url || null,
      about: body?.about || null,
      ai_summary: aiSummary,
      industry_tags: industryTags,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
