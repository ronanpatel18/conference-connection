# Conference Connection

**AI-Powered Networking Platform for the Wisconsin Sports Business Conference**

> Visit at [wsbcconnect.com](https://wsbcconnect.com)

A full-stack web application that transforms conference networking by using AI to automatically enrich attendee profiles, enabling meaningful professional connections through intelligent matching and discovery.

## Overview

Built to serve 200+ attendees at the Wisconsin Sports Business Conference, this platform replaces traditional name badges and paper directories with an intelligent digital networking experience. Attendees register with basic professional info, and AI automatically researches their background, generates professional summaries, and categorizes them by industry expertise — making it effortless to find the right people to connect with.

## Key Features

- **AI Profile Enrichment Pipeline** — Multi-step process combining Tavily web search with Google Gemini to generate professional summaries and industry tags from minimal user input
- **Automatic LinkedIn Discovery** — Intelligent scoring algorithm that auto-finds attendees' LinkedIn profiles using name, company, and job title
- **Interactive Network Discovery** — Filterable, searchable attendee directory with animated flip-cards revealing AI-generated insights
- **Admin Dashboard** — Full CRUD management, bulk operations, custom ordering, pinned profiles, and AI summary regeneration
- **Secure Auth & RBAC** — Supabase Auth with Row Level Security policies and allowlist-based admin access
- **Tiered Rate Limiting** — Redis-backed (Upstash) rate limiting with in-memory fallback, protecting expensive AI operations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 18, TypeScript |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth |
| AI | Google Gemini API, Tavily API (web search) |
| Styling | Tailwind CSS, Framer Motion |
| Validation | Zod |
| Rate Limiting | Upstash Redis (prod) / In-memory (dev) |

## Architecture

```
Client → Next.js App Router (SSR + Client Components)
API Layer → Next.js Route Handlers with Zod validation
Auth → Supabase Auth + RLS policies
Database → PostgreSQL (Supabase) with optimized indexes
AI Pipeline → Tavily Search → Google Gemini → Structured Output
Rate Limiting → Upstash Redis (prod) / In-memory (dev)
```

## Technical Highlights

- **Robust AI Integration** — Gemini model fallbacks, multiple JSON response formats, graceful degradation when APIs are unavailable
- **Input Sanitization** — Zod validation with HTML escaping, null byte removal, and unicode normalization across all API routes
- **Mobile-First UX** — Touch detection distinguishing taps from scrolls for card interactions; responsive grid layouts
- **10+ RESTful API Routes** — Clean separation of concerns with auth, validation, and error handling per endpoint

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Google Gemini API key

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DEFAULT_GEMINI_API_KEY=your_gemini_api_key

# Optional
TAVILY_API_KEY=your_tavily_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_ALLOWLIST_EMAILS=admin@example.com
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint
```
