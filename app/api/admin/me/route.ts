import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = isEmailAllowed(user?.email ?? null);
  return NextResponse.json({ isAdmin });
}
