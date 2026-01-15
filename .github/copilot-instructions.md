# Copilot instructions for conference-connection

## Big picture architecture
- Next.js 15 App Router app in app/ with client-heavy UI (Framer Motion + Tailwind). Shared shell in [app/layout.tsx](app/layout.tsx).
- Primary flow: Onboarding form -> AI enrichment -> Supabase insert -> network list.
  - Onboarding UI + submit logic lives in [components/OnboardingForm.tsx](components/OnboardingForm.tsx).
  - POST /api/enrich-profile in [app/api/enrich-profile/route.ts](app/api/enrich-profile/route.ts) calls Tavily for web search and Gemini for summaries/tags.
  - Data persisted to Supabase table `attendees` defined in [supabase-schema.sql](supabase-schema.sql) and typed in [types/database.types.ts](types/database.types.ts).
  - Network view loads attendees from Supabase in [app/network/page.tsx](app/network/page.tsx) and renders cards in [components/AttendeeCard.tsx](components/AttendeeCard.tsx).

## Key integrations & env vars
- Supabase: browser client in [utils/supabase/client.ts](utils/supabase/client.ts), server client in [utils/supabase/server.ts](utils/supabase/server.ts). Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see setup notes in [SETUP-PROMPT-02.md](SETUP-PROMPT-02.md)).
- AI enrichment endpoint requires:
  - `DEFAULT_GEMINI_API_KEY` (required)
  - `GEMINI_MODEL` or `DEFAULT_GEMINI_MODEL` (optional override; defaults to gemini-3-flash-preview)
  - `TAVILY_API_KEY` for web search; endpoint continues with empty context if missing.
- There is also an OpenAI-based helper in [lib/enrichment.ts](lib/enrichment.ts) (not wired into the API route); keep it in mind if refactoring AI providers.

## Project-specific patterns
- Client components explicitly use `"use client"` and fetch Supabase with `createClient()` from utils. Server components can use the SSR client from utils/supabase/server.
- Styling is Tailwind + class composition via `cn()` in [lib/utils.ts](lib/utils.ts). Reuse `cn` instead of manual string concat.
- Attendee card colors are derived from `industry_tags` in [components/AttendeeCard.tsx](components/AttendeeCard.tsx); keep tag semantics (broad/domain/role) in sync with AI prompt in the enrich API.

## Developer workflows
- Common scripts (see [package.json](package.json)): `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
- Manual API testing guidance and sample payloads live in [scripts/test-enrich-api.ts](scripts/test-enrich-api.ts) (note: it’s a TS file and describes how to run via a TS loader).

## Files to reference when changing behavior
- Enrichment prompt + response handling: [app/api/enrich-profile/route.ts](app/api/enrich-profile/route.ts)
- Supabase schema and policies: [supabase-schema.sql](supabase-schema.sql)
- Attendee typing: [types/database.types.ts](types/database.types.ts)
- UI entrypoints: [app/page.tsx](app/page.tsx), [app/onboarding/page.tsx](app/onboarding/page.tsx), [app/network/page.tsx](app/network/page.tsx)
