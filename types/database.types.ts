// TypeScript types for Supabase database schema

export interface Database {
  public: {
    Tables: {
      attendees: {
        Row: {
          id: string
          user_id: string | null
          name: string
          email: string
          linkedin_url: string | null
          job_title: string | null
          company: string | null
          about: string | null
          ai_summary: string | null
          industry_tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          email: string
          linkedin_url?: string | null
          job_title?: string | null
          company?: string | null
          about?: string | null
          ai_summary?: string | null
          industry_tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          email?: string
          linkedin_url?: string | null
          job_title?: string | null
          company?: string | null
          about?: string | null
          ai_summary?: string | null
          industry_tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Helper type for attendee data
export type Attendee = Database['public']['Tables']['attendees']['Row']
export type AttendeeInsert = Database['public']['Tables']['attendees']['Insert']
export type AttendeeUpdate = Database['public']['Tables']['attendees']['Update']
