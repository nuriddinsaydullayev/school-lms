/**
 * database.types.ts
 *
 * Hand-written stub that matches the Supabase JS v2 generic constraint.
 * Replace this entire file with the CLI output once your project is live:
 *
 *   npx supabase gen types typescript \
 *     --project-id YOUR_PROJECT_REF \
 *     --schema public \
 *     > src/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─────────────────────────────────────────────────────────────────────────────
// Enum helpers
// ─────────────────────────────────────────────────────────────────────────────
export type UserRole        = 'student' | 'teacher' | 'admin'
export type SubmissionStatus = 'pending' | 'submitted' | 'graded' | 'returned'
export type TokenType       = 'earned'  | 'spent'    | 'bonus'

// ─────────────────────────────────────────────────────────────────────────────
// Database shape
// ─────────────────────────────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: { schools: { Row: { school_id: string | null; id: string; name: string; subdomain: string; created_at: string }; Insert: { school_id?: string | null; id?: string; name: string; subdomain: string; created_at?: string }; Update: { school_id?: string | null; name?: string; subdomain?: string }; Relationships: [] };
      // ── profiles ─────────────────────────────────────────────
      profiles: {
        Row: { school_id: string | null;
          id:          string
          role:        UserRole
          full_name:   string
          avatar_url:  string | null
          bio:         string | null
          xp_points:   number
          level:       number
          created_at:  string
          updated_at:  string
        }
        Insert: { school_id?: string | null;
          id:          string
          role?:       UserRole
          full_name:   string
          avatar_url?: string | null
          bio?:        string | null
          xp_points?:  number
          level?:      number
          created_at?: string
          updated_at?: string
        }
        Update: { school_id?: string | null;
          id?:         string
          role?:       UserRole
          full_name?:  string
          avatar_url?: string | null
          bio?:        string | null
          xp_points?:  number
          level?:      number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // ── classes ───────────────────────────────────────────────
      classes: {
        Row: { school_id: string | null;
          id:          string
          teacher_id:  string
          name:        string
          description: string | null
          subject:     string | null
          join_code:   string
          is_active:   boolean
          created_at:  string
          updated_at:  string
        }
        Insert: { school_id?: string | null;
          id?:          string
          teacher_id:   string
          name:         string
          description?: string | null
          subject?:     string | null
          join_code?:   string
          is_active?:   boolean
          created_at?:  string
          updated_at?:  string
        }
        Update: { school_id?: string | null;
          id?:          string
          teacher_id?:  string
          name?:        string
          description?: string | null
          subject?:     string | null
          join_code?:   string
          is_active?:   boolean
          created_at?:  string
          updated_at?:  string
        }
        Relationships: []
      }

      // ── class_enrollments ─────────────────────────────────────
      class_enrollments: {
        Row: { school_id: string | null;
          id:          string
          class_id:    string
          student_id:  string
          enrolled_at: string
        }
        Insert: { school_id?: string | null;
          id?:          string
          class_id:     string
          student_id:   string
          enrolled_at?: string
        }
        Update: { school_id?: string | null;
          id?:          string
          class_id?:    string
          student_id?:  string
          enrolled_at?: string
        }
        Relationships: []
      }

      // ── assignments ───────────────────────────────────────────
      assignments: {
        Row: { school_id: string | null;
          id:               string
          class_id:         string
          teacher_id:       string
          title:            string
          description:      string | null
          due_date:         string | null
          max_score:        number
          xp_reward:        number
          token_reward:     number
          is_published:     boolean
          ai_hints_enabled: boolean
          created_at:       string
          updated_at:       string
        }
        Insert: { school_id?: string | null;
          id?:               string
          class_id:          string
          teacher_id:        string
          title:             string
          description?:      string | null
          due_date?:         string | null
          max_score?:        number
          xp_reward?:        number
          token_reward?:     number
          is_published?:     boolean
          ai_hints_enabled?: boolean
          created_at?:       string
          updated_at?:       string
        }
        Update: { school_id?: string | null;
          id?:               string
          class_id?:         string
          teacher_id?:       string
          title?:            string
          description?:      string | null
          due_date?:         string | null
          max_score?:        number
          xp_reward?:        number
          token_reward?:     number
          is_published?:     boolean
          ai_hints_enabled?: boolean
          created_at?:       string
          updated_at?:       string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── submissions ───────────────────────────────────────────
      submissions: {
        Row: { school_id: string | null;
          id:            string
          assignment_id: string
          student_id:    string
          status:        SubmissionStatus
          content:       string | null
          file_url:      string | null
          score:         number | null
          feedback:      string | null
          ai_feedback:   string | null
          submitted_at:  string | null
          graded_at:     string | null
          created_at:    string
          updated_at:    string
        }
        Insert: { school_id?: string | null;
          id?:            string
          assignment_id:  string
          student_id:     string
          status?:        SubmissionStatus
          content?:       string | null
          file_url?:      string | null
          score?:         number | null
          feedback?:      string | null
          ai_feedback?:   string | null
          submitted_at?:  string | null
          graded_at?:     string | null
          created_at?:    string
          updated_at?:    string
        }
        Update: { school_id?: string | null;
          id?:            string
          assignment_id?: string
          student_id?:    string
          status?:        SubmissionStatus
          content?:       string | null
          file_url?:      string | null
          score?:         number | null
          feedback?:      string | null
          ai_feedback?:   string | null
          submitted_at?:  string | null
          graded_at?:     string | null
          created_at?:    string
          updated_at?:    string
        }
        Relationships: []
      }

      // ── tokens ────────────────────────────────────────────────
      tokens: {
        Row: { school_id: string | null;
          id:           string
          student_id:   string
          type:         TokenType
          amount:       number
          reason:       string
          reference_id: string | null
          created_at:   string
        }
        Insert: { school_id?: string | null;
          id?:           string
          student_id:    string
          type:          TokenType
          amount:        number
          reason:        string
          reference_id?: string | null
          created_at?:   string
        }
        Update: { school_id?: string | null;
          id?:           string
          student_id?:   string
          type?:         TokenType
          amount?:       number
          reason?:       string
          reference_id?: string | null
          created_at?:   string
        }
        Relationships: []
      }

      // ── ai_tutor_logs ─────────────────────────────────────────
      ai_tutor_logs: {
        Row: { school_id: string | null;
          id:            string
          student_id:    string
          assignment_id: string | null
          prompt:        string
          response:      string
          model:         string
          tokens_used:   number | null
          created_at:    string
        }
        Insert: { school_id?: string | null;
          id?:            string
          student_id:     string
          assignment_id?: string | null
          prompt:         string
          response:       string
          model?:         string
          tokens_used?:   number | null
          created_at?:    string
        }
        Update: { school_id?: string | null;
          id?:            string
          student_id?:    string
          assignment_id?: string | null
          prompt?:        string
          response?:      string
          model?:         string
          tokens_used?:   number | null
          created_at?:    string
        }
        Relationships: []
      }
    }

    // ── Views ────────────────────────────────────────────────
    Views: {
      token_balances: {
        Row: { school_id: string | null;
          student_id:   string | null
          balance:      number | null
          total_earned: number | null
          total_spent:  number | null
        }
        Relationships: []
      }
    }

    // ── Functions ─────────────────────────────────────────────
    Functions: {
      get_my_role: {
        Args:    Record<PropertyKey, never>
        Returns: UserRole
      }
    }

    // ── Enums ─────────────────────────────────────────────────
    Enums: {
      user_role:        UserRole
      submission_status: SubmissionStatus
      token_type:       TokenType
    }

    // ── Required by supabase-js generic constraint ────────────
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ── Convenience row types ─────────────────────────────────────
export type ProfileRow        = Database['public']['Tables']['profiles']['Row']
export type ClassRow          = Database['public']['Tables']['classes']['Row']
export type AssignmentRow     = Database['public']['Tables']['assignments']['Row']
export type SubmissionRow     = Database['public']['Tables']['submissions']['Row']
export type TokenRow          = Database['public']['Tables']['tokens']['Row']
export type AiTutorLogRow     = Database['public']['Tables']['ai_tutor_logs']['Row']
export type TokenBalanceRow   = Database['public']['Views']['token_balances']['Row']
