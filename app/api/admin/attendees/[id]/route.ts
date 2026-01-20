import { NextResponse } from "next/server";
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

export async function PATCH(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isEmailAllowed(user?.email ?? null)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY server env var" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as AttendeeUpdate;
  const requestUrl = new URL(request.url);
  const id = requestUrl.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing attendee id" }, { status: 400 });
  }
  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("attendees")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isEmailAllowed(user?.email ?? null)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY server env var" },
      { status: 500 }
    );
  }

  const requestUrl = new URL(request.url);
  const id = requestUrl.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing attendee id" }, { status: 400 });
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: attendee, error: attendeeError } = await admin
    .from("attendees")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (attendeeError) {
    return NextResponse.json({ success: false, error: attendeeError.message }, { status: 500 });
  }

  const { error: deleteProfileError } = await admin.from("attendees").delete().eq("id", id);

  if (deleteProfileError) {
    return NextResponse.json(
      { success: false, error: deleteProfileError.message },
      { status: 500 }
    );
  }

  if (attendee?.user_id) {
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(attendee.user_id);
    if (deleteUserError) {
      return NextResponse.json(
        { success: false, error: deleteUserError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
