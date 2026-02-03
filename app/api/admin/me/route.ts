import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { rateLimiters } from "@/lib/rate-limit";
import { isEmailAllowed } from "@/lib/admin";
import { secureJsonResponse } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await rateLimiters.standard(request);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = isEmailAllowed(user?.email ?? null);
  return secureJsonResponse({ isAdmin });
}
