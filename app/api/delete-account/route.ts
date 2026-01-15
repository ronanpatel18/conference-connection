import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
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

    const admin = createAdminClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Delete attendee profile first
    const { error: deleteProfileError } = await admin
      .from("attendees")
      .delete()
      .eq("user_id", user.id);

    if (deleteProfileError) {
      return NextResponse.json(
        { success: false, error: deleteProfileError.message },
        { status: 500 }
      );
    }

    // Delete auth user
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      return NextResponse.json(
        { success: false, error: deleteUserError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
