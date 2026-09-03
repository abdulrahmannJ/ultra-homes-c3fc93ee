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
      agents: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          id: string
          is_published: boolean
          name: string
          phone: string | null
          photo_url: string | null
          sort_order: number
          title: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_published?: boolean
          name: string
          phone?: string | null
          photo_url?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_published?: boolean
          name?: string
          phone?: string | null
          photo_url?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          property_id: string | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          property_id?: string | null
          source?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          property_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          contract_path: string | null
          created_at: string
          deposit: number
          end_date: string | null
          grace_days: number
          id: string
          id_document_path: string | null
          monthly_rent: number
          move_out_date: string | null
          move_out_notes: string | null
          rent_due_day: number
          start_date: string
          status: string
          tenant_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          contract_path?: string | null
          created_at?: string
          deposit?: number
          end_date?: string | null
          grace_days?: number
          id?: string
          id_document_path?: string | null
          monthly_rent?: number
          move_out_date?: string | null
          move_out_notes?: string | null
          rent_due_day?: number
          start_date?: string
          status?: string
          tenant_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          contract_path?: string | null
          created_at?: string
          deposit?: number
          end_date?: string | null
          grace_days?: number
          id?: string
          id_document_path?: string | null
          monthly_rent?: number
          move_out_date?: string | null
          move_out_notes?: string | null
          rent_due_day?: number
          start_date?: string
          status?: string
          tenant_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          agent_id: string | null
          amenities: string[]
          area_sqft: number | null
          bathrooms: number
          bedrooms: number
          brochure_url: string | null
          completion_date: string | null
          construction_status: string | null
          county: string | null
          created_at: string
          currency: string
          description: string | null
          developer: string | null
          discount_price: number | null
          featured_image: string | null
          floor_plan_url: string | null
          garage: number
          id: string
          images: string[]
          is_archived: boolean
          is_featured: boolean
          is_published: boolean
          latitude: number | null
          listing_purpose: string
          listing_type: string
          longitude: number | null
          nearby_hospitals: string[]
          nearby_schools: string[]
          nearby_shopping: string[]
          neighborhood: string | null
          payment_plan: string | null
          plot_size: string | null
          price: number
          property_type: string
          short_description: string | null
          slug: string
          status: string
          structure: string
          title: string
          town: string | null
          updated_at: string
          views: number
          virtual_tour_url: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          amenities?: string[]
          area_sqft?: number | null
          bathrooms?: number
          bedrooms?: number
          brochure_url?: string | null
          completion_date?: string | null
          construction_status?: string | null
          county?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          developer?: string | null
          discount_price?: number | null
          featured_image?: string | null
          floor_plan_url?: string | null
          garage?: number
          id?: string
          images?: string[]
          is_archived?: boolean
          is_featured?: boolean
          is_published?: boolean
          latitude?: number | null
          listing_purpose?: string
          listing_type?: string
          longitude?: number | null
          nearby_hospitals?: string[]
          nearby_schools?: string[]
          nearby_shopping?: string[]
          neighborhood?: string | null
          payment_plan?: string | null
          plot_size?: string | null
          price?: number
          property_type?: string
          short_description?: string | null
          slug: string
          status?: string
          structure?: string
          title: string
          town?: string | null
          updated_at?: string
          views?: number
          virtual_tour_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          amenities?: string[]
          area_sqft?: number | null
          bathrooms?: number
          bedrooms?: number
          brochure_url?: string | null
          completion_date?: string | null
          construction_status?: string | null
          county?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          developer?: string | null
          discount_price?: number | null
          featured_image?: string | null
          floor_plan_url?: string | null
          garage?: number
          id?: string
          images?: string[]
          is_archived?: boolean
          is_featured?: boolean
          is_published?: boolean
          latitude?: number | null
          listing_purpose?: string
          listing_type?: string
          longitude?: number | null
          nearby_hospitals?: string[]
          nearby_schools?: string[]
          nearby_shopping?: string[]
          neighborhood?: string | null
          payment_plan?: string | null
          plot_size?: string | null
          price?: number
          property_type?: string
          short_description?: string | null
          slug?: string
          status?: string
          structure?: string
          title?: string
          town?: string | null
          updated_at?: string
          views?: number
          virtual_tour_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      property_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          is_cover: boolean
          path: string
          property_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          path: string
          property_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          path?: string
          property_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_units: {
        Row: {
          amenities: string[]
          bathrooms: number
          bedrooms: number
          block: string | null
          created_at: string
          deposit: number
          description: string | null
          floor: string | null
          furnished: boolean
          id: string
          is_featured: boolean
          is_published: boolean
          label: string
          monthly_rent: number
          notes: string | null
          parking_spaces: number
          property_id: string
          rent_due_day: number
          sale_price: number | null
          service_charge: number
          size_sqm: number | null
          sort_order: number
          status: string
          toilets: number
          unit_type: string
          updated_at: string
        }
        Insert: {
          amenities?: string[]
          bathrooms?: number
          bedrooms?: number
          block?: string | null
          created_at?: string
          deposit?: number
          description?: string | null
          floor?: string | null
          furnished?: boolean
          id?: string
          is_featured?: boolean
          is_published?: boolean
          label: string
          monthly_rent?: number
          notes?: string | null
          parking_spaces?: number
          property_id: string
          rent_due_day?: number
          sale_price?: number | null
          service_charge?: number
          size_sqm?: number | null
          sort_order?: number
          status?: string
          toilets?: number
          unit_type?: string
          updated_at?: string
        }
        Update: {
          amenities?: string[]
          bathrooms?: number
          bedrooms?: number
          block?: string | null
          created_at?: string
          deposit?: number
          description?: string | null
          floor?: string | null
          furnished?: boolean
          id?: string
          is_featured?: boolean
          is_published?: boolean
          label?: string
          monthly_rent?: number
          notes?: string | null
          parking_spaces?: number
          property_id?: string
          rent_due_day?: number
          sale_price?: number | null
          service_charge?: number
          size_sqm?: number | null
          sort_order?: number
          status?: string
          toilets?: number
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_charges: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          lease_id: string
          period_end: string
          period_start: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date: string
          id?: string
          lease_id: string
          period_end: string
          period_start: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          lease_id?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_charges_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          lease_id: string
          method: string
          notes: string | null
          paid_on: string
          recorded_by: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          lease_id: string
          method?: string
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          lease_id?: string
          method?: string
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          is_active: boolean
          permissions: string[]
          phone: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          is_active?: boolean
          permissions?: string[]
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          is_active?: boolean
          permissions?: string[]
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          email: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          id_number: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean
          message: string
          name: string
          photo_url: string | null
          rating: number
          role: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean
          message: string
          name: string
          photo_url?: string | null
          rating?: number
          role?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean
          message?: string
          name?: string
          photo_url?: string | null
          rating?: number
          role?: string | null
        }
        Relationships: []
      }
      unit_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          is_cover: boolean
          path: string
          sort_order: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          path: string
          sort_order?: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          path?: string
          sort_order?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_images_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      claim_first_admin: { Args: never; Returns: boolean }
      generate_rent_charges: { Args: never; Returns: number }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      property_vacancy: {
        Args: { _property_id: string }
        Returns: {
          total_units: number
          vacant_units: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "editor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "editor"],
    },
  },
} as const
