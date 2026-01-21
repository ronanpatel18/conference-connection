import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("attendees")
    .select("id, name")
    .ilike("name", name)
    .is("user_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const attendee = data?.[0];
  if (!attendee) {
    return NextResponse.json({ success: true, found: false });
  }

  return NextResponse.json({ success: true, found: true, attendeeId: attendee.id });
}
