import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import type { AttendeeUpdate } from "@/types/database.types";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const body = (await request.json()) as AttendeeUpdate;
  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("attendees")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
