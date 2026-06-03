export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      attendance: {
        Row: {
          event_id: string
          id: string
          points_awarded: number
          scanned_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          points_awarded?: number
          scanned_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          points_awarded?: number
          scanned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          event_type: string | null
          gender: Database["public"]["Enums"]["event_gender"]
          group_link: string | null
          id: string
          is_online: boolean
          is_pinned: boolean
          is_recurring: boolean
          max_infaq: number | null
          min_infaq: number | null
          points_reward: number
          poster_url: string | null
          price: number | null
          program_id: string | null
          qr_token: string
          recurring_days: number[]
          recurring_end_time: string | null
          recurring_start_time: string | null
          recurring_until: string | null
          registration_type: string | null
          speaker: string | null
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          success_message: string | null
          title: string
          updated_at: string
          venue: string
          youtube_url: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string | null
          gender?: Database["public"]["Enums"]["event_gender"]
          group_link?: string | null
          id?: string
          is_online?: boolean
          is_pinned?: boolean
          is_recurring?: boolean
          max_infaq?: number | null
          min_infaq?: number | null
          points_reward?: number
          poster_url?: string | null
          price?: number | null
          program_id?: string | null
          qr_token?: string
          recurring_days?: number[]
          recurring_end_time?: string | null
          recurring_start_time?: string | null
          recurring_until?: string | null
          registration_type?: string | null
          speaker?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          success_message?: string | null
          title: string
          updated_at?: string
          venue: string
          youtube_url?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string | null
          gender?: Database["public"]["Enums"]["event_gender"]
          group_link?: string | null
          id?: string
          is_online?: boolean
          is_pinned?: boolean
          is_recurring?: boolean
          max_infaq?: number | null
          min_infaq?: number | null
          points_reward?: number
          poster_url?: string | null
          price?: number | null
          program_id?: string | null
          qr_token?: string
          recurring_days?: number[]
          recurring_end_time?: string | null
          recurring_start_time?: string | null
          recurring_until?: string | null
          registration_type?: string | null
          speaker?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          success_message?: string | null
          title?: string
          updated_at?: string
          venue?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          created_at: string
          cta_href: string | null
          cta_label: string | null
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_resets: {
        Row: {
          created_at: string
          delivered: boolean
          delivery_error: string | null
          id: string
          message: string | null
          phone: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered?: boolean
          delivery_error?: string | null
          id?: string
          message?: string | null
          phone: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered?: boolean
          delivery_error?: string | null
          id?: string
          message?: string | null
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order: number | null
          qr_url: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order?: number | null
          qr_url?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order?: number | null
          qr_url?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          app_role: Database["public"]["Enums"]["app_role"] | null
          avatar_url: string | null
          birth_date: string | null
          bonus_awarded: boolean
          city: string | null
          created_at: string
          district_code: string | null
          district_name: string | null
          email: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          hobi: string | null
          id: string
          instansi: string | null
          is_complete: boolean
          occupation: string | null
          phone: string
          points: number
          province_code: string | null
          province_name: string | null
          regency_code: string | null
          regency_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          app_role?: Database["public"]["Enums"]["app_role"] | null
          avatar_url?: string | null
          birth_date?: string | null
          bonus_awarded?: boolean
          city?: string | null
          created_at?: string
          district_code?: string | null
          district_name?: string | null
          email?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          hobi?: string | null
          id: string
          instansi?: string | null
          is_complete?: boolean
          occupation?: string | null
          phone: string
          points?: number
          province_code?: string | null
          province_name?: string | null
          regency_code?: string | null
          regency_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          app_role?: Database["public"]["Enums"]["app_role"] | null
          avatar_url?: string | null
          birth_date?: string | null
          bonus_awarded?: boolean
          city?: string | null
          created_at?: string
          district_code?: string | null
          district_name?: string | null
          email?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          hobi?: string | null
          id?: string
          instansi?: string | null
          is_complete?: boolean
          occupation?: string | null
          phone?: string
          points?: number
          province_code?: string | null
          province_name?: string | null
          regency_code?: string | null
          regency_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          code: string
          created_at: string
          description: string | null
          gender_restriction: Database["public"]["Enums"]["gender"] | null
          id: string
          name: string
          qr_token: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          gender_restriction?: Database["public"]["Enums"]["gender"] | null
          id?: string
          name: string
          qr_token?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          gender_restriction?: Database["public"]["Enums"]["gender"] | null
          id?: string
          name?: string
          qr_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      qris_methods: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          qr_url: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          qr_url: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          qr_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          cost_points: number
          created_at: string
          id: string
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          cost_points: number
          created_at?: string
          id?: string
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          cost_points?: number
          created_at?: string
          id?: string
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          amount_paid: number | null
          created_at: string
          event_id: string
          id: string
          paid_at: string | null
          payment_proof_url: string | null
          payment_status: string | null
          user_id: string
          attendance_mode: string | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          event_id: string
          id?: string
          paid_at?: string | null
          payment_proof_url?: string | null
          payment_status?: string | null
          user_id: string
          attendance_mode?: string | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          event_id?: string
          id?: string
          paid_at?: string | null
          payment_proof_url?: string | null
          payment_status?: string | null
          user_id?: string
          attendance_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          cost_points: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          stock: number
        }
        Insert: {
          cost_points: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          stock?: number
        }
        Update: {
          cost_points?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          stock?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_event_qr: { Args: { _id: string }; Returns: string }
      admin_get_program_qr: { Args: { _id: string }; Returns: string }
      archive_old_events: { Args: never; Returns: undefined }
      check_is_admin: { Args: never; Returns: boolean }
      find_active_event_by_program_token: {
        Args: { _token: string }
        Returns: string
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { role_name: string; user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      record_attendance: {
        Args: { _event_id: string; _token: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      event_gender: "ALL" | "L" | "P"
      event_status: "active" | "finished" | "archived"
      gender: "L" | "P"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      event_gender: ["ALL", "L", "P"],
      event_status: ["active", "finished", "archived"],
      gender: ["L", "P"],
    },
  },
} as const
