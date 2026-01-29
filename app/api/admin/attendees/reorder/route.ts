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

interface ReorderItem {
  id: string;
  sort_order: number;
  is_pinned?: boolean;
}

export async function POST(request: Request) {
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

  const body = await request.json();
  const items: ReorderItem[] = Array.isArray(body?.items) ? body.items : [];

  if (items.length === 0) {
    return NextResponse.json({ success: false, error: "No items to reorder" }, { status: 400 });
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
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
    return NextResponse.json(
      { success: false, error: errors[0].error?.message || "Failed to reorder" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
