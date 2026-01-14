# Supabase Database Setup - Complete ✅

This file contains all the setup code and instructions for Prompt 02.

## 📋 What Was Created

### **1. Supabase Client Files**
- `utils/supabase/client.ts` - Client-side Supabase client
- `utils/supabase/server.ts` - Server-side Supabase client (SSR)
- `types/database.types.ts` - TypeScript types for database schema

### **2. Database Schema**
- `supabase-schema.sql` - Complete SQL to run in Supabase SQL Editor

### **3. Configuration**
- `.env.local.example` - Environment variable template
- Updated `package.json` with Supabase dependencies

---

## 🚀 Step-by-Step Setup Instructions

### **Step 1: Install Supabase Packages**

```bash
npm install @supabase/ssr @supabase/supabase-js
```

### **Step 2: Set Up Supabase Project**

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project (free tier)
3. Wait for database to provision (~2 minutes)
4. Go to **Project Settings** → **API**
5. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### **Step 3: Configure Environment Variables**

1. Create `.env.local` file in project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Replace with your actual values from Step 2

### **Step 4: Create Database Table**

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** or press `Ctrl+Enter`
6. You should see: "Success. No rows returned"

This creates:
- ✅ `attendees` table with all fields
- ✅ Indexes for performance
- ✅ RLS policies (public read, open insert/update for MVP)
- ✅ Auto-updating `updated_at` timestamp trigger

### **Step 5: Verify Database Setup**

1. Go to **Table Editor** in Supabase
2. You should see the `attendees` table
3. Click on it to view the schema

---

## 📊 Database Schema

### **attendees table**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (auto-generated) |
| `name` | text | Attendee full name |
| `email` | text | Email (unique) |
| `linkedin_url` | text | LinkedIn profile URL (optional) |
| `job_title` | text | Current job title (optional) |
| `company` | text | Current company (optional) |
| `ai_summary` | text | AI-generated summary from web research (nullable) |
| `industry_tags` | text[] | Array of industry/skill tags |
| `created_at` | timestamp | Auto-set on creation |
| `updated_at` | timestamp | Auto-updated on changes |

---

## 🔒 Security (RLS Policies)

**Current Setup (MVP):**
- ✅ Anyone can **read** all attendee profiles (public)
- ✅ Anyone can **insert** new attendees (open registration)
- ✅ Anyone can **update** attendees (for MVP simplicity)

**For Production:** You'd want to add proper authentication and restrict updates to record owners only.

---

## 💻 Using the Supabase Client in Your Code

### **Client Component Example:**

```typescript
'use client'
import { createClient } from '@/utils/supabase/client'

export default function MyComponent() {
  const supabase = createClient()
  
  // Fetch all attendees
  const { data, error } = await supabase
    .from('attendees')
    .select('*')
  
  return <div>{/* your component */}</div>
}
```

### **Server Component Example:**

```typescript
import { createClient } from '@/utils/supabase/server'

export default async function MyServerComponent() {
  const supabase = await createClient()
  
  // Fetch all attendees
  const { data, error } = await supabase
    .from('attendees')
    .select('*')
  
  return <div>{/* your component */}</div>
}
```

---

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] `.env.local` file created with correct values
- [ ] SQL schema run successfully in Supabase SQL Editor
- [ ] `attendees` table visible in Table Editor
- [ ] Supabase packages installed (`npm install`)
- [ ] TypeScript types available in `types/database.types.ts`

---

## 🎯 Next Steps

You're now ready for **Prompt 03: AI Integration & API Routes** where you'll:
- Set up API routes to insert attendee data
- Integrate AI to research and generate summaries
- Create the registration form

Your database backend is fully configured! 🎉
