import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

interface CleanupRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CleanupRequest;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
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

    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (usersError) {
      return NextResponse.json(
        { success: false, error: usersError.message },
        { status: 500 }
      );
    }

    const existingUser = usersData.users.find(
      (user) => user.email?.toLowerCase() === email
    );

    if (!existingUser) {
      return NextResponse.json({ success: true, deleted: false, reason: "not_found" });
    }

    const { data: attendee, error: attendeeError } = await admin
      .from("attendees")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (attendeeError) {
      return NextResponse.json(
        { success: false, error: attendeeError.message },
        { status: 500 }
      );
    }

    if (attendee) {
      return NextResponse.json({
        success: true,
        deleted: false,
        reason: "profile_exists",
      });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(existingUser.id);
    if (deleteError) {
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
