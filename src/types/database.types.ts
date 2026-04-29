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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts_sent: {
        Row: {
          id: string
          lot_id: string | null
          sent_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          lot_id?: string | null
          sent_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          lot_id?: string | null
          sent_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_sent_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      applicators: {
        Row: {
          auth_user_id: string | null
          authorized_exams: string[] | null
          birth_date: string | null
          certified_levels: string[] | null
          city: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          external_id: string | null
          id: string
          location_zone: string | null
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          rate_per_hour: number | null
          roles: string[] | null
        }
        Insert: {
          auth_user_id?: string | null
          authorized_exams?: string[] | null
          birth_date?: string | null
          certified_levels?: string[] | null
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          location_zone?: string | null
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          rate_per_hour?: number | null
          roles?: string[] | null
        }
        Update: {
          auth_user_id?: string | null
          authorized_exams?: string[] | null
          birth_date?: string | null
          certified_levels?: string[] | null
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          location_zone?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          rate_per_hour?: number | null
          roles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "applicators_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string | null
          changed_at: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          org_id: string | null
          performed_by: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action?: string | null
          changed_at?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          org_id?: string | null
          performed_by?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string | null
          changed_at?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          org_id?: string | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          id: string
          month: number
          org_id: string
          updated_at: string | null
          updated_by: string | null
          year: number
        }
        Insert: {
          amount?: number
          category_id: string
          id?: string
          month: number
          org_id: string
          updated_at?: string | null
          updated_by?: string | null
          year: number
        }
        Update: {
          amount?: number
          category_id?: string
          id?: string
          month?: number
          org_id?: string
          updated_at?: string | null
          updated_by?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cenni_cases: {
        Row: {
          acta_o_curp: boolean | null
          celular: string | null
          certificado: string | null
          certificate_sent_at: string | null
          certificate_sent_to: string | null
          certificate_storage_path: string | null
          certificate_uploaded_at: string | null
          cliente: string | null
          cliente_estudiante: string
          correo: string | null
          created_at: string | null
          datos_curp: string | null
          deleted_at: string | null
          estatus: Database["public"]["Enums"]["cenni_status"] | null
          estatus_certificado:
            | Database["public"]["Enums"]["cenni_cert_status"]
            | null
          fecha_recepcion: string | null
          fecha_revision: string | null
          folio_cenni: string
          id: string
          id_documento: boolean | null
          motivo_rechazo: string | null
          notes: string | null
          org_id: string
          solicitud_cenni: boolean | null
          updated_at: string | null
        }
        Insert: {
          acta_o_curp?: boolean | null
          celular?: string | null
          certificado?: string | null
          certificate_sent_at?: string | null
          certificate_sent_to?: string | null
          certificate_storage_path?: string | null
          certificate_uploaded_at?: string | null
          cliente?: string | null
          cliente_estudiante: string
          correo?: string | null
          created_at?: string | null
          datos_curp?: string | null
          deleted_at?: string | null
          estatus?: Database["public"]["Enums"]["cenni_status"] | null
          estatus_certificado?:
            | Database["public"]["Enums"]["cenni_cert_status"]
            | null
          fecha_recepcion?: string | null
          fecha_revision?: string | null
          folio_cenni: string
          id?: string
          id_documento?: boolean | null
          motivo_rechazo?: string | null
          notes?: string | null
          org_id: string
          solicitud_cenni?: boolean | null
          updated_at?: string | null
        }
        Update: {
          acta_o_curp?: boolean | null
          celular?: string | null
          certificado?: string | null
          certificate_sent_at?: string | null
          certificate_sent_to?: string | null
          certificate_storage_path?: string | null
          certificate_uploaded_at?: string | null
          cliente?: string | null
          cliente_estudiante?: string
          correo?: string | null
          created_at?: string | null
          datos_curp?: string | null
          deleted_at?: string | null
          estatus?: Database["public"]["Enums"]["cenni_status"] | null
          estatus_certificado?:
            | Database["public"]["Enums"]["cenni_cert_status"]
            | null
          fecha_recepcion?: string | null
          fecha_revision?: string | null
          folio_cenni?: string
          id?: string
          id_documento?: boolean | null
          motivo_rechazo?: string | null
          notes?: string | null
          org_id?: string
          solicitud_cenni?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cenni_cases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cenni_scraper_jobs: {
        Row: {
          created_at: string
          finished_at: string | null
          folio_cenni: string | null
          id: string
          kind: string
          org_id: string
          requested_by: string | null
          result: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          folio_cenni?: string | null
          id?: string
          kind: string
          org_id: string
          requested_by?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          folio_cenni?: string | null
          id?: string
          kind?: string
          org_id?: string
          requested_by?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cenni_scraper_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          module_slug: string
          org_id: string
          record_id: string | null
          tags: string[] | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          module_slug: string
          org_id: string
          record_id?: string | null
          tags?: string[] | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          module_slug?: string
          org_id?: string
          record_id?: string | null
          tags?: string[] | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          classrooms: Json | null
          component_order: Json | null
          created_at: string | null
          date: string
          delivery_mode: string | null
          event_id: string | null
          exam_type: string
          id: string
          parameters: Json | null
          speaking_date: string | null
        }
        Insert: {
          classrooms?: Json | null
          component_order?: Json | null
          created_at?: string | null
          date: string
          delivery_mode?: string | null
          event_id?: string | null
          exam_type: string
          id?: string
          parameters?: Json | null
          speaking_date?: string | null
        }
        Update: {
          classrooms?: Json | null
          component_order?: Json | null
          created_at?: string | null
          date?: string
          delivery_mode?: string | null
          event_id?: string | null
          exam_type?: string
          id?: string
          parameters?: Json | null
          speaking_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_slots: {
        Row: {
          applicator_id: string | null
          candidates: string[] | null
          component: string | null
          created_at: string
          date: string | null
          end_time: string
          event_id: string
          id: string
          is_break: boolean
          session_id: string | null
          slot_number: number
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          applicator_id?: string | null
          candidates?: string[] | null
          component?: string | null
          created_at?: string
          date?: string | null
          end_time: string
          event_id: string
          id?: string
          is_break?: boolean
          session_id?: string | null
          slot_number: number
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicator_id?: string | null
          candidates?: string[] | null
          component?: string | null
          created_at?: string
          date?: string | null
          end_time?: string
          event_id?: string
          id?: string
          is_break?: boolean
          session_id?: string | null
          slot_number?: number
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_slots_applicator_id_fkey"
            columns: ["applicator_id"]
            isOneToOne: false
            referencedRelation: "applicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_slots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "event_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff: {
        Row: {
          applicator_id: string
          created_at: string
          event_id: string
          id: string
          role: string
          session_id: string | null
        }
        Insert: {
          applicator_id: string
          created_at?: string
          event_id: string
          id?: string
          role: string
          session_id?: string | null
        }
        Update: {
          applicator_id?: string
          created_at?: string
          event_id?: string
          id?: string
          role?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_applicator_id_fkey"
            columns: ["applicator_id"]
            isOneToOne: false
            referencedRelation: "applicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "event_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          date: string
          exam_type: string
          id: string
          org_id: string
          parameters: Json | null
          school_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          exam_type: string
          id?: string
          org_id: string
          parameters?: Json | null
          school_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          exam_type?: string
          id?: string
          org_id?: string
          parameters?: Json | null
          school_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          exam_type: string
          expiration_date: string | null
          id: string
          is_active: boolean | null
          org_id: string
          registration_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          exam_type: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          org_id: string
          registration_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          exam_type?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string
          registration_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_codes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      filters: {
        Row: {
          active: boolean | null
          created_at: string | null
          damage_type: string | null
          id: string
          make: string | null
          max_price: number | null
          model: string | null
          telegram_chat_id: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          damage_type?: string | null
          id?: string
          make?: string | null
          max_price?: number | null
          model?: string | null
          telegram_chat_id?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          damage_type?: string | null
          id?: string
          make?: string | null
          max_price?: number | null
          model?: string | null
          telegram_chat_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lots: {
        Row: {
          auction_date: string | null
          created_at: string | null
          current_bid: number | null
          damage_type: string | null
          id: string
          image_url: string | null
          location: string | null
          lot_number: string
          lot_url: string | null
          make: string | null
          model: string | null
          raw_data: Json | null
          source: string | null
          year: number | null
        }
        Insert: {
          auction_date?: string | null
          created_at?: string | null
          current_bid?: number | null
          damage_type?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          lot_number: string
          lot_url?: string | null
          make?: string | null
          model?: string | null
          raw_data?: Json | null
          source?: string | null
          year?: number | null
        }
        Update: {
          auction_date?: string | null
          created_at?: string | null
          current_bid?: number | null
          damage_type?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          lot_number?: string
          lot_url?: string | null
          make?: string | null
          model?: string | null
          raw_data?: Json | null
          source?: string | null
          year?: number | null
        }
        Relationships: []
      }
      member_module_access: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          member_id: string
          module: string
          org_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          member_id: string
          module: string
          org_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          member_id?: string
          module?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_module_access_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "org_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_module_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      module_fields: {
        Row: {
          created_at: string | null
          default_value: string | null
          field_type: string
          id: string
          is_required: boolean | null
          is_searchable: boolean | null
          label: string
          module_id: string
          name: string
          options: Json | null
          show_in_list: boolean | null
          sort_order: number | null
          validation: Json | null
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          field_type: string
          id?: string
          is_required?: boolean | null
          is_searchable?: boolean | null
          label: string
          module_id: string
          name: string
          options?: Json | null
          show_in_list?: boolean | null
          sort_order?: number | null
          validation?: Json | null
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          is_searchable?: boolean | null
          label?: string
          module_id?: string
          name?: string
          options?: Json | null
          show_in_list?: boolean | null
          sort_order?: number | null
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "module_fields_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          id: string
          module_id: string
          role: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          id?: string
          module_id: string
          role: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          id?: string
          module_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      module_records: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: Json
          id: string
          is_active: boolean | null
          module_id: string
          org_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data?: Json
          id?: string
          is_active?: boolean | null
          module_id: string
          org_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: Json
          id?: string
          is_active?: boolean | null
          module_id?: string
          org_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_records_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "module_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      module_registry: {
        Row: {
          category: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_native: boolean | null
          name: string
          org_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_native?: boolean | null
          name: string
          org_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_native?: boolean | null
          name?: string
          org_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_registry_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      movements: {
        Row: {
          applicator_id: string | null
          applicator_name: string | null
          created_at: string | null
          id: string
          new_status: string
          notes: string | null
          org_id: string
          pack_id: string
          performed_by: string | null
          previous_status: string | null
          school_id: string | null
          school_name: string | null
          type: string
        }
        Insert: {
          applicator_id?: string | null
          applicator_name?: string | null
          created_at?: string | null
          id?: string
          new_status: string
          notes?: string | null
          org_id: string
          pack_id: string
          performed_by?: string | null
          previous_status?: string | null
          school_id?: string | null
          school_name?: string | null
          type: string
        }
        Update: {
          applicator_id?: string | null
          applicator_name?: string | null
          created_at?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          org_id?: string
          pack_id?: string
          performed_by?: string | null
          previous_status?: string | null
          school_id?: string | null
          school_name?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "movements_applicator_id_fkey"
            columns: ["applicator_id"]
            isOneToOne: false
            referencedRelation: "applicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_tmpl: string | null
          channel: string | null
          created_at: string | null
          id: string
          org_id: string | null
          slug: string
          title_tmpl: string
          type: string | null
        }
        Insert: {
          body_tmpl?: string | null
          channel?: string | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          slug: string
          title_tmpl: string
          type?: string | null
        }
        Update: {
          body_tmpl?: string | null
          channel?: string | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          slug?: string
          title_tmpl?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          module_slug: string | null
          org_id: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          module_slug?: string | null
          org_id: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          module_slug?: string | null
          org_id?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          org_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string | null
          id: string
          job_title: string | null
          location: string | null
          org_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      packs: {
        Row: {
          applicator_id: string | null
          codigo: string
          created_at: string | null
          current_applicator_id: string | null
          current_event_id: string | null
          deleted_at: string | null
          fecha: string | null
          hora_entrada: string | null
          hora_salida: string | null
          id: string
          nombre: string | null
          notes: string | null
          org_id: string | null
          school_id: string | null
          status: Database["public"]["Enums"]["pack_status"] | null
          updated_at: string | null
        }
        Insert: {
          applicator_id?: string | null
          codigo: string
          created_at?: string | null
          current_applicator_id?: string | null
          current_event_id?: string | null
          deleted_at?: string | null
          fecha?: string | null
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          nombre?: string | null
          notes?: string | null
          org_id?: string | null
          school_id?: string | null
          status?: Database["public"]["Enums"]["pack_status"] | null
          updated_at?: string | null
        }
        Update: {
          applicator_id?: string | null
          codigo?: string
          created_at?: string | null
          current_applicator_id?: string | null
          current_event_id?: string | null
          deleted_at?: string | null
          fecha?: string | null
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          nombre?: string | null
          notes?: string | null
          org_id?: string | null
          school_id?: string | null
          status?: Database["public"]["Enums"]["pack_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packs_applicator_id_fkey"
            columns: ["applicator_id"]
            isOneToOne: false
            referencedRelation: "applicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_concepts: {
        Row: {
          concept_key: string
          cost: number
          created_at: string | null
          currency: string | null
          description: string
          expiration_date: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          concept_key: string
          cost: number
          created_at?: string | null
          currency?: string | null
          description: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          concept_key?: string
          cost?: number
          created_at?: string | null
          currency?: string | null
          description?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          concept_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          custom_concept: string | null
          discount: number | null
          email: string | null
          first_name: string | null
          folio: string
          id: string
          institution: string | null
          is_active: boolean | null
          last_name: string | null
          location: string | null
          notes: string | null
          org_id: string
          payment_method: string | null
          person_name: string
          quantity: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          concept_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_concept?: string | null
          discount?: number | null
          email?: string | null
          first_name?: string | null
          folio: string
          id?: string
          institution?: string | null
          is_active?: boolean | null
          last_name?: string | null
          location?: string | null
          notes?: string | null
          org_id: string
          payment_method?: string | null
          person_name: string
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          concept_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_concept?: string | null
          discount?: number | null
          email?: string | null
          first_name?: string | null
          folio?: string
          id?: string
          institution?: string | null
          is_active?: boolean | null
          last_name?: string | null
          location?: string | null
          notes?: string | null
          org_id?: string
          payment_method?: string | null
          person_name?: string
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "payment_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      petty_cash_movements: {
        Row: {
          amount: number
          category_id: string
          concept: string
          created_at: string | null
          created_by: string | null
          date: string
          deleted_at: string | null
          id: string
          notes: string | null
          org_id: string
          partial_amount: number | null
          receipt_url: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          category_id: string
          concept: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          partial_amount?: number | null
          receipt_url?: string | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          concept?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          partial_amount?: number | null
          receipt_url?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_movements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_settings: {
        Row: {
          created_at: string | null
          id: string
          initial_balance: number
          org_id: string
          updated_at: string | null
          updated_by: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          initial_balance?: number
          org_id: string
          updated_at?: string | null
          updated_by?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          initial_balance?: number
          org_id?: string
          updated_at?: string | null
          updated_by?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      poa_lines: {
        Row: {
          budgeted_amount: number
          concept: string
          created_by: string | null
          id: string
          month: number
          notes: string | null
          org_id: string
          real_amount: number | null
          section: string
          sort_order: number
          source: string
          updated_at: string
          year: number
        }
        Insert: {
          budgeted_amount?: number
          concept: string
          created_by?: string | null
          id?: string
          month: number
          notes?: string | null
          org_id: string
          real_amount?: number | null
          section?: string
          sort_order?: number
          source?: string
          updated_at?: string
          year: number
        }
        Update: {
          budgeted_amount?: number
          concept?: string
          created_by?: string | null
          id?: string
          month?: number
          notes?: string | null
          org_id?: string
          real_amount?: number | null
          section?: string
          sort_order?: number
          source?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "poa_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_path: string | null
          folio: string
          id: string
          is_active: boolean | null
          org_id: string | null
          provider: string | null
          quote_id: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          folio: string
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          provider?: string | null
          quote_id?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          folio?: string
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          provider?: string | null
          quote_id?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_path: string | null
          folio: string
          id: string
          is_active: boolean | null
          org_id: string | null
          provider: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          folio: string
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          provider?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          folio?: string
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          provider?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          levels: string[] | null
          name: string
          notes: string | null
          operating_hours: Json | null
          org_id: string
          rooms: Json | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          levels?: string[] | null
          name: string
          notes?: string | null
          operating_hours?: Json | null
          org_id: string
          rooms?: Json | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          levels?: string[] | null
          name?: string
          notes?: string | null
          operating_hours?: Json | null
          org_id?: string
          rooms?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_logs: {
        Row: {
          alerts_sent: number | null
          id: string
          lots_found: number | null
          lots_new: number | null
          run_at: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          alerts_sent?: number | null
          id?: string
          lots_found?: number | null
          lots_new?: number | null
          run_at?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          alerts_sent?: number | null
          id?: string
          lots_found?: number | null
          lots_new?: number | null
          run_at?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          category: string | null
          contact: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          org_id: string
          phone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          category?: string | null
          contact?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          org_id: string
          phone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          category?: string | null
          contact?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          org_id?: string
          phone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      toefl_administrations: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string | null
          expected_students: number | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          org_id: string
          school_id: string | null
          status: string | null
          test_date: string
          test_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          expected_students?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          org_id: string
          school_id?: string | null
          status?: string | null
          test_date: string
          test_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          expected_students?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          org_id?: string
          school_id?: string | null
          status?: string | null
          test_date?: string
          test_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toefl_administrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toefl_administrations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      toefl_codes: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          candidate_details: Json | null
          created_at: string | null
          created_by: string | null
          expiration_date: string | null
          folio: string
          id: string
          is_active: boolean | null
          org_id: string
          purchase_order_id: string | null
          session_id: string | null
          status: string | null
          system_uniq_id: string | null
          test_type: string
          updated_at: string | null
          voucher_code: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          candidate_details?: Json | null
          created_at?: string | null
          created_by?: string | null
          expiration_date?: string | null
          folio: string
          id?: string
          is_active?: boolean | null
          org_id: string
          purchase_order_id?: string | null
          session_id?: string | null
          status?: string | null
          system_uniq_id?: string | null
          test_type: string
          updated_at?: string | null
          voucher_code?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          candidate_details?: Json | null
          created_at?: string | null
          created_by?: string | null
          expiration_date?: string | null
          folio?: string
          id?: string
          is_active?: boolean | null
          org_id?: string
          purchase_order_id?: string | null
          session_id?: string | null
          status?: string | null
          system_uniq_id?: string | null
          test_type?: string
          updated_at?: string | null
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toefl_codes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toefl_codes_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toefl_codes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "toefl_administrations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_log_resolve_org_id: {
        Args: { p_new_data?: Json; p_old_data?: Json; p_table_name: string }
        Returns: string
      }
      audit_log_uuid_or_null: { Args: { p_value: string }; Returns: string }
      create_movement_and_update_pack: {
        Args: {
          p_applicator_id?: string
          p_applicator_name?: string
          p_notes?: string
          p_org_id: string
          p_pack_id: string
          p_school_id?: string
          p_school_name?: string
          p_type: string
        }
        Returns: Json
      }
      fn_accept_invitation: {
        Args: { p_token: string; p_user_email: string; p_user_id: string }
        Returns: Json
      }
      fn_expire_old_invitations: { Args: never; Returns: number }
      fn_petty_cash_balance: {
        Args: { p_org_id: string; p_year: number }
        Returns: number
      }
      fn_seed_member_permissions_for_member: {
        Args: {
          p_member_id: string
          p_org_id: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: undefined
      }
      generate_organization_slug: {
        Args: {
          current_org_id?: string
          org_name: string
          requested_slug?: string
        }
        Returns: string
      }
      get_my_orgs: { Args: never; Returns: string[] }
      get_users_emails: {
        Args: { user_ids: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
      is_org_admin: { Args: { check_org_id: string }; Returns: boolean }
      slugify_organization: { Args: { value: string }; Returns: string }
    }
    Enums: {
      cenni_cert_status:
        | "APROBADO"
        | "RECHAZADO"
        | "EN PROCESO DE DICTAMINACION"
      cenni_status:
        | "EN OFICINA"
        | "SOLICITADO"
        | "EN TRAMITE/REVISION"
        | "APROBADO"
        | "RECHAZADO"
      invitation_status: "pending" | "accepted" | "expired" | "revoked"
      member_role: "admin" | "supervisor" | "operador" | "applicator"
      module_type:
        | "inventory"
        | "schools"
        | "applicators"
        | "events"
        | "venues"
        | "catalog"
        | "payroll"
        | "cenni"
        | "calculator"
        | "metrics"
        | "users"
      pack_status: "EN_SITIO" | "PRESTADO"
      user_role: "admin" | "supervisor" | "operador" | "applicator"
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
      cenni_cert_status: [
        "APROBADO",
        "RECHAZADO",
        "EN PROCESO DE DICTAMINACION",
      ],
      cenni_status: [
        "EN OFICINA",
        "SOLICITADO",
        "EN TRAMITE/REVISION",
        "APROBADO",
        "RECHAZADO",
      ],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      member_role: ["admin", "supervisor", "operador", "applicator"],
      module_type: [
        "inventory",
        "schools",
        "applicators",
        "events",
        "venues",
        "catalog",
        "payroll",
        "cenni",
        "calculator",
        "metrics",
        "users",
      ],
      pack_status: ["EN_SITIO", "PRESTADO"],
      user_role: ["admin", "supervisor", "operador", "applicator"],
    },
  },
} as const
