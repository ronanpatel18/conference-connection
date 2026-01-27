# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wisconsin Sports Business Conference networking platform built with Next.js 15 (App Router), Supabase, and AI enrichment via Google Gemini.

**Core Flow:** User registers → AI enriches profile (Gemini + Tavily web search) → Supabase insert → Network discovery view

## Development Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint
```

## Architecture

### Technology Stack
- **Framework:** Next.js 15 with App Router, React 18, TypeScript
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Auth:** Supabase Auth
- **AI:** Google Gemini API for profile summarization, Tavily API for web search
- **Styling:** Tailwind CSS with Framer Motion animations

### Key Routes
- `/` - Home page with conference info
- `/onboarding` - Registration form collecting profile data
- `/network` - Browse enriched attendee profiles (requires auth)
- `/profile` - View/edit own profile
- `/admin` - Admin dashboard (allowlist-based access)
- `/api/enrich-profile` - AI enrichment endpoint (Gemini + Tavily)

### Supabase Client Usage
- **Client components:** Use `createClient()` from `@/utils/supabase/client`
- **Server components:** Use `await createClient()` from `@/utils/supabase/server`

### Database Schema
Main table is `attendees` with fields: `id`, `user_id`, `name`, `email`, `linkedin_url`, `job_title`, `company`, `about`, `ai_summary`, `industry_tags[]`, `created_at`, `updated_at`

Schema definition in `supabase-schema.sql`, types in `types/database.types.ts`

## Environment Variables

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `DEFAULT_GEMINI_API_KEY` - Google Gemini API key

**Optional:**
- `TAVILY_API_KEY` - Web search (gracefully skips if missing)
- `GEMINI_MODEL` - Override model (defaults to gemini-3-flash-preview)
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations
- `ADMIN_ALLOWLIST_EMAILS` - Comma-separated admin emails

## Code Patterns

- Use `cn()` from `@/lib/utils` for Tailwind class merging
- Client components marked with `"use client"` directive
- API routes use `NextRequest`/`NextResponse` from `next/server`
- Color scheme: Badger red (#c5050c), dark variant (#9b0000)

## Key Files for Common Tasks

| Task | Primary File |
|------|-------------|
| AI enrichment logic | `app/api/enrich-profile/route.ts` |
| Database schema changes | `supabase-schema.sql`, `types/database.types.ts` |
| Registration form | `app/onboarding/page.tsx`, `components/OnboardingForm.tsx` |
| Profile cards/tags | `components/AttendeeCard.tsx` |
| Admin features | `app/admin/page.tsx`, `app/api/admin/*` |
