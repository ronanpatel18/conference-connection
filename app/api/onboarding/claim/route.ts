import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
  const attendeeId = typeof body?.attendeeId === "string" ? body.attendeeId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!attendeeId || !name || !email) {
    return NextResponse.json(
      { success: false, error: "attendeeId, name, and email are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("attendees")
    .update({ user_id: user.id, email, name })
    .eq("id", attendeeId)
    .is("user_id", null)
    .ilike("name", name)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, error: "Profile not available" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data });
}
