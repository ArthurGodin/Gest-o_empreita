export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      billing_charges: {
        Row: {
          amount_cents: number
          asaas_payment_id: string | null
          company_id: string
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          invoice_url: string | null
          kind: Database["public"]["Enums"]["charge_kind"]
          manual_payment_note: string | null
          paid_at: string | null
          paid_manually_at: string | null
          paid_manually_by: string | null
          payment_provider: string
          pix_qr_code: string | null
          pix_qr_image_b64: string | null
          project_id: string
          released_at: string | null
          released_by_token: string | null
          status: Database["public"]["Enums"]["charge_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          asaas_payment_id?: string | null
          company_id: string
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          kind: Database["public"]["Enums"]["charge_kind"]
          manual_payment_note?: string | null
          paid_at?: string | null
          paid_manually_at?: string | null
          paid_manually_by?: string | null
          payment_provider?: string
          pix_qr_code?: string | null
          pix_qr_image_b64?: string | null
          project_id: string
          released_at?: string | null
          released_by_token?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          asaas_payment_id?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          kind?: Database["public"]["Enums"]["charge_kind"]
          manual_payment_note?: string | null
          paid_at?: string | null
          paid_manually_at?: string | null
          paid_manually_by?: string | null
          payment_provider?: string
          pix_qr_code?: string | null
          pix_qr_image_b64?: string | null
          project_id?: string
          released_at?: string | null
          released_by_token?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_charges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_charges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_webhook_events: {
        Row: {
          asaas_event_id: string
          asaas_payment_id: string | null
          created_at: string
          event_type: string
          id: string
          processed_at: string | null
          processing_error: string | null
          raw_payload: Json
        }
        Insert: {
          asaas_event_id: string
          asaas_payment_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          processed_at?: string | null
          processing_error?: string | null
          raw_payload: Json
        }
        Update: {
          asaas_event_id?: string
          asaas_payment_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          processed_at?: string | null
          processing_error?: string | null
          raw_payload?: Json
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          company_id: string
          created_at: string
          default_price_cents: number
          description: string
          id: string
          last_used_at: string | null
          reference_adjustment_basis_points: number | null
          reference_code: string | null
          reference_competence: string | null
          reference_cost_cents: number | null
          reference_description: string | null
          reference_kind:
            | Database["public"]["Enums"]["sinapi_reference_kind"]
            | null
          reference_regime: Database["public"]["Enums"]["sinapi_regime"] | null
          reference_release_sha256: string | null
          reference_revision: number | null
          reference_source: string | null
          reference_uf: string | null
          reference_unit: string | null
          sinapi_entry_id: string | null
          unit: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          company_id: string
          created_at?: string
          default_price_cents?: number
          description: string
          id?: string
          last_used_at?: string | null
          reference_adjustment_basis_points?: number | null
          reference_code?: string | null
          reference_competence?: string | null
          reference_cost_cents?: number | null
          reference_description?: string | null
          reference_kind?:
            | Database["public"]["Enums"]["sinapi_reference_kind"]
            | null
          reference_regime?: Database["public"]["Enums"]["sinapi_regime"] | null
          reference_release_sha256?: string | null
          reference_revision?: number | null
          reference_source?: string | null
          reference_uf?: string | null
          reference_unit?: string | null
          sinapi_entry_id?: string | null
          unit?: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          default_price_cents?: number
          description?: string
          id?: string
          last_used_at?: string | null
          reference_adjustment_basis_points?: number | null
          reference_code?: string | null
          reference_competence?: string | null
          reference_cost_cents?: number | null
          reference_description?: string | null
          reference_kind?:
            | Database["public"]["Enums"]["sinapi_reference_kind"]
            | null
          reference_regime?: Database["public"]["Enums"]["sinapi_regime"] | null
          reference_release_sha256?: string | null
          reference_revision?: number | null
          reference_source?: string | null
          reference_uf?: string | null
          reference_unit?: string | null
          sinapi_entry_id?: string | null
          unit?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_sinapi_entry_id_fkey"
            columns: ["sinapi_entry_id"]
            isOneToOne: false
            referencedRelation: "sinapi_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          name: string
          payment_provider: string
          phone: string | null
          pix_instructions: string | null
          pix_key: string | null
          pix_key_type: string | null
          pix_receiver_city: string | null
          pix_receiver_name: string | null
          plan: string
          saas_asaas_customer_id: string | null
          saas_asaas_subscription_id: string | null
          saas_asaas_subscription_plan: string | null
          saas_pending_checkout_started_at: string | null
          saas_pending_checkout_token: string | null
          saas_pending_payment_link_id: string | null
          saas_pending_payment_link_url: string | null
          saas_pending_plan: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name: string
          payment_provider?: string
          phone?: string | null
          pix_instructions?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_receiver_city?: string | null
          pix_receiver_name?: string | null
          plan?: string
          saas_asaas_customer_id?: string | null
          saas_asaas_subscription_id?: string | null
          saas_asaas_subscription_plan?: string | null
          saas_pending_checkout_started_at?: string | null
          saas_pending_checkout_token?: string | null
          saas_pending_payment_link_id?: string | null
          saas_pending_payment_link_url?: string | null
          saas_pending_plan?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          payment_provider?: string
          phone?: string | null
          pix_instructions?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_receiver_city?: string | null
          pix_receiver_name?: string | null
          plan?: string
          saas_asaas_customer_id?: string | null
          saas_asaas_subscription_id?: string | null
          saas_asaas_subscription_plan?: string | null
          saas_pending_checkout_started_at?: string | null
          saas_pending_checkout_token?: string | null
          saas_pending_payment_link_id?: string | null
          saas_pending_payment_link_url?: string | null
          saas_pending_plan?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          role: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_billing_profiles: {
        Row: {
          asaas_customer_id: string
          company_id: string
          cpf_cnpj: string
          created_at: string
          customer_id: string
          id: string
          updated_at: string
        }
        Insert: {
          asaas_customer_id: string
          company_id: string
          cpf_cnpj: string
          created_at?: string
          customer_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string
          company_id?: string
          cpf_cnpj?: string
          created_at?: string
          customer_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_billing_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_billing_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          author_id: string | null
          body: string
          company_id: string
          created_at: string
          id: string
          project_id: string
          weather: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string
          company_id: string
          created_at?: string
          id?: string
          project_id: string
          weather?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          project_id?: string
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_photos: {
        Row: {
          company_id: string
          created_at: string
          entry_id: string
          height: number | null
          id: string
          position: number
          project_id: string
          size_bytes: number
          storage_path: string
          width: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entry_id: string
          height?: number | null
          id?: string
          position?: number
          project_id: string
          size_bytes: number
          storage_path: string
          width?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entry_id?: string
          height?: number | null
          id?: string
          position?: number
          project_id?: string
          size_bytes?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diary_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_photos_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_incidents: {
        Row: {
          check_name: string
          created_at: string
          fingerprint: string
          first_seen_at: string
          last_notified_at: string | null
          last_seen_at: string
          occurrence_count: number
          resolved_at: string | null
          safe_context: Json
          severity: string
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          check_name: string
          created_at?: string
          fingerprint: string
          first_seen_at?: string
          last_notified_at?: string | null
          last_seen_at?: string
          occurrence_count?: number
          resolved_at?: string | null
          safe_context?: Json
          severity: string
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          check_name?: string
          created_at?: string
          fingerprint?: string
          first_seen_at?: string
          last_notified_at?: string | null
          last_seen_at?: string
          occurrence_count?: number
          resolved_at?: string | null
          safe_context?: Json
          severity?: string
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      operational_monitor_runs: {
        Row: {
          alert_count: number
          check_counts: Json
          created_at: string
          error_code: string | null
          finished_at: string | null
          id: string
          incident_count: number
          run_key: string
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          alert_count?: number
          check_counts?: Json
          created_at?: string
          error_code?: string | null
          finished_at?: string | null
          id?: string
          incident_count?: number
          run_key: string
          started_at?: string
          status?: string
          trigger: string
        }
        Update: {
          alert_count?: number
          check_counts?: Json
          created_at?: string
          error_code?: string | null
          finished_at?: string | null
          id?: string
          incident_count?: number
          run_key?: string
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: []
      }
      project_costs: {
        Row: {
          amount_cents: number
          category: Database["public"]["Enums"]["cost_category"]
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          incurred_on: string
          project_id: string
          stage_id: string | null
        }
        Insert: {
          amount_cents: number
          category: Database["public"]["Enums"]["cost_category"]
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          incurred_on?: string
          project_id: string
          stage_id?: string | null
        }
        Update: {
          amount_cents?: number
          category?: Database["public"]["Enums"]["cost_category"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          incurred_on?: string
          project_id?: string
          stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_costs_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          company_id: string
          completed_on: string | null
          created_at: string
          est_days: number | null
          id: string
          name: string
          notes: string | null
          position: number
          project_id: string
          started_on: string | null
          status: Database["public"]["Enums"]["stage_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_on?: string | null
          created_at?: string
          est_days?: number | null
          id?: string
          name: string
          notes?: string | null
          position?: number
          project_id: string
          started_on?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_on?: string | null
          created_at?: string
          est_days?: number | null
          id?: string
          name?: string
          notes?: string | null
          position?: number
          project_id?: string
          started_on?: string | null
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          budget_cents: number | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_approved_at: string | null
          delivery_approved_token: string | null
          description: string | null
          ends_on: string | null
          entry_pct: number | null
          id: string
          last_diary_at: string | null
          name: string
          progress_pct: number | null
          starts_on: string | null
          status: Database["public"]["Enums"]["project_status"]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          budget_cents?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_approved_at?: string | null
          delivery_approved_token?: string | null
          description?: string | null
          ends_on?: string | null
          entry_pct?: number | null
          id?: string
          last_diary_at?: string | null
          name: string
          progress_pct?: number | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          budget_cents?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_approved_at?: string | null
          delivery_approved_token?: string | null
          description?: string | null
          ends_on?: string | null
          entry_pct?: number | null
          id?: string
          last_diary_at?: string | null
          name?: string
          progress_pct?: number | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "stage_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_approvals: {
        Row: {
          action: Database["public"]["Enums"]["quote_approval_action"]
          company_id: string
          created_at: string
          id: string
          ip_address: unknown
          quote_id: string
          rejection_reason: string | null
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["quote_approval_action"]
          company_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          quote_id: string
          rejection_reason?: string | null
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["quote_approval_action"]
          company_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          quote_id?: string
          rejection_reason?: string | null
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_approvals_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          id: string
          position: number
          quantity: number
          quote_id: string
          reference_adjustment_basis_points: number | null
          reference_code: string | null
          reference_competence: string | null
          reference_cost_cents: number | null
          reference_description: string | null
          reference_kind:
            | Database["public"]["Enums"]["sinapi_reference_kind"]
            | null
          reference_regime: Database["public"]["Enums"]["sinapi_regime"] | null
          reference_release_sha256: string | null
          reference_revision: number | null
          reference_source: string | null
          reference_uf: string | null
          reference_unit: string | null
          sinapi_entry_id: string | null
          total_cents: number
          unit: string
          unit_price_cents: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          id?: string
          position?: number
          quantity?: number
          quote_id: string
          reference_adjustment_basis_points?: number | null
          reference_code?: string | null
          reference_competence?: string | null
          reference_cost_cents?: number | null
          reference_description?: string | null
          reference_kind?:
            | Database["public"]["Enums"]["sinapi_reference_kind"]
            | null
          reference_regime?: Database["public"]["Enums"]["sinapi_regime"] | null
          reference_release_sha256?: string | null
          reference_revision?: number | null
          reference_source?: string | null
          reference_uf?: string | null
          reference_unit?: string | null
          sinapi_entry_id?: string | null
          total_cents?: number
          unit?: string
          unit_price_cents?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          position?: number
          quantity?: number
          quote_id?: string
          reference_adjustment_basis_points?: number | null
          reference_code?: string | null
          reference_competence?: string | null
          reference_cost_cents?: number | null
          reference_description?: string | null
          reference_kind?:
            | Database["public"]["Enums"]["sinapi_reference_kind"]
            | null
          reference_regime?: Database["public"]["Enums"]["sinapi_regime"] | null
          reference_release_sha256?: string | null
          reference_revision?: number | null
          reference_source?: string | null
          reference_uf?: string | null
          reference_unit?: string | null
          sinapi_entry_id?: string | null
          total_cents?: number
          unit?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_sinapi_entry_id_fkey"
            columns: ["sinapi_entry_id"]
            isOneToOne: false
            referencedRelation: "sinapi_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_sequences: {
        Row: {
          company_id: string
          last_num: number
          year: number
        }
        Insert: {
          company_id: string
          last_num?: number
          year: number
        }
        Update: {
          company_id?: string
          last_num?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approved_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          discount_cents: number
          id: string
          notes: string | null
          notification_sent_at: string | null
          number: string
          pdf_generated_at: string | null
          pdf_storage_path: string | null
          project_id: string | null
          rejected_at: string | null
          revision_source_id: string | null
          sent_at: string | null
          share_token: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal_cents: number
          title: string
          total_cents: number
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          approved_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          discount_cents?: number
          id?: string
          notes?: string | null
          notification_sent_at?: string | null
          number: string
          pdf_generated_at?: string | null
          pdf_storage_path?: string | null
          project_id?: string | null
          rejected_at?: string | null
          revision_source_id?: string | null
          sent_at?: string | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal_cents?: number
          title: string
          total_cents?: number
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          approved_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          discount_cents?: number
          id?: string
          notes?: string | null
          notification_sent_at?: string | null
          number?: string
          pdf_generated_at?: string | null
          pdf_storage_path?: string | null
          project_id?: string | null
          rejected_at?: string | null
          revision_source_id?: string | null
          sent_at?: string | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal_cents?: number
          title?: string
          total_cents?: number
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_revision_source_id_fkey"
            columns: ["revision_source_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      sinapi_entries: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["sinapi_reference_kind"]
          price_metadata: Json
          prices_cents: Json
          regime: Database["public"]["Enums"]["sinapi_regime"]
          release_id: string
          search_text: string
          unit: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["sinapi_reference_kind"]
          price_metadata?: Json
          prices_cents: Json
          regime: Database["public"]["Enums"]["sinapi_regime"]
          release_id: string
          search_text: string
          unit: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["sinapi_reference_kind"]
          price_metadata?: Json
          prices_cents?: Json
          regime?: Database["public"]["Enums"]["sinapi_regime"]
          release_id?: string
          search_text?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinapi_entries_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "sinapi_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      sinapi_releases: {
        Row: {
          competence: string
          created_at: string
          id: string
          imported_at: string
          imported_by: string | null
          layout_id: string
          priced_row_count: number
          published_at: string | null
          revision: number
          row_count: number
          source_file_name: string
          source_published_at: string | null
          source_sha256: string
          source_size_bytes: number
          source_storage_path: string
          source_url: string
          status: Database["public"]["Enums"]["sinapi_release_status"]
          superseded_at: string | null
          validation_summary: Json
        }
        Insert: {
          competence: string
          created_at?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          layout_id: string
          priced_row_count?: number
          published_at?: string | null
          revision?: number
          row_count?: number
          source_file_name: string
          source_published_at?: string | null
          source_sha256: string
          source_size_bytes: number
          source_storage_path: string
          source_url: string
          status?: Database["public"]["Enums"]["sinapi_release_status"]
          superseded_at?: string | null
          validation_summary?: Json
        }
        Update: {
          competence?: string
          created_at?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          layout_id?: string
          priced_row_count?: number
          published_at?: string | null
          revision?: number
          row_count?: number
          source_file_name?: string
          source_published_at?: string | null
          source_sha256?: string
          source_size_bytes?: number
          source_storage_path?: string
          source_url?: string
          status?: Database["public"]["Enums"]["sinapi_release_status"]
          superseded_at?: string | null
          validation_summary?: Json
        }
        Relationships: []
      }
      stage_template_items: {
        Row: {
          created_at: string
          est_days: number | null
          id: string
          name: string
          position: number
          template_id: string
        }
        Insert: {
          created_at?: string
          est_days?: number | null
          id?: string
          name: string
          position?: number
          template_id: string
        }
        Update: {
          created_at?: string
          est_days?: number | null
          id?: string
          name?: string
          position?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "stage_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_templates: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          ended_at: string | null
          gps_accuracy_m: number | null
          gps_lat: number | null
          gps_lng: number | null
          hours_worked: number | null
          id: string
          notes: string | null
          project_id: string
          started_at: string
          worked_on: string
          worker_name: string
          worker_role: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          gps_accuracy_m?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          project_id: string
          started_at: string
          worked_on?: string
          worker_name: string
          worker_role?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          gps_accuracy_m?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          project_id?: string
          started_at?: string
          worked_on?: string
          worker_name?: string
          worker_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_diary_entry: {
        Args: {
          p_body: string
          p_company_id: string
          p_photos: Json
          p_project_id: string
        }
        Returns: string
      }
      instantiate_template_stages: {
        Args: {
          p_company_id: string
          p_project_id: string
          p_template_id: string
        }
        Returns: number
      }
      is_valid_sinapi_price_metadata: {
        Args: { p_metadata: Json }
        Returns: boolean
      }
      is_valid_sinapi_prices: { Args: { p_prices: Json }; Returns: boolean }
      list_sinapi_releases: {
        Args: { p_company_id: string }
        Returns: {
          competence: string
          published_at: string
          revision: number
          row_count: number
        }[]
      }
      next_quote_number: { Args: { p_company_id: string }; Returns: string }
      normalize_sinapi_search_text: {
        Args: { p_value: string }
        Returns: string
      }
      publish_sinapi_release: {
        Args: { p_expected_sha256: string; p_release_id: string }
        Returns: string
      }
      reject_sinapi_release: {
        Args: { p_reason: string; p_release_id: string }
        Returns: string
      }
      replace_quote_items: {
        Args: {
          p_company_id: string
          p_customer_id: string
          p_description: string | null
          p_items: Json
          p_notes: string | null
          p_quote_id: string
          p_title: string
          p_valid_until: string | null
        }
        Returns: undefined
      }
      search_sinapi: {
        Args: {
          p_company_id: string
          p_competence?: string
          p_kind?: Database["public"]["Enums"]["sinapi_reference_kind"]
          p_limit?: number
          p_offset?: number
          p_query: string
          p_regime?: Database["public"]["Enums"]["sinapi_regime"]
          p_uf: string
        }
        Returns: {
          code: string
          competence: string
          cost_cents: number
          description: string
          entry_id: string
          kind: Database["public"]["Enums"]["sinapi_reference_kind"]
          price_metadata: Json
          regime: Database["public"]["Enums"]["sinapi_regime"]
          revision: number
          source_label: string
          uf: string
          unit: string
        }[]
      }
      user_company_ids: { Args: never; Returns: string[] }
      user_role_in: {
        Args: { p_company_id: string }
        Returns: Database["public"]["Enums"]["company_role"]
      }
    }
    Enums: {
      charge_kind: "entrada" | "saldo"
      charge_status:
        | "draft"
        | "pending"
        | "overdue"
        | "received"
        | "confirmed"
        | "cancelled"
      company_role: "owner" | "manager" | "foreman" | "worker"
      cost_category: "material" | "labor" | "freight" | "other"
      project_status:
        | "planning"
        | "in_progress"
        | "paused"
        | "completed"
        | "cancelled"
      quote_approval_action: "approved" | "rejected"
      quote_status:
        | "draft"
        | "sent"
        | "viewed"
        | "approved"
        | "rejected"
        | "expired"
      sinapi_reference_kind: "input" | "composition"
      sinapi_regime:
        | "sem_desoneracao"
        | "com_desoneracao"
        | "sem_encargos_sociais"
      sinapi_release_status: "staging" | "published" | "superseded" | "rejected"
      stage_status: "todo" | "in_progress" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      charge_kind: ["entrada", "saldo"],
      charge_status: [
        "draft",
        "pending",
        "overdue",
        "received",
        "confirmed",
        "cancelled",
      ],
      company_role: ["owner", "manager", "foreman", "worker"],
      cost_category: ["material", "labor", "freight", "other"],
      project_status: [
        "planning",
        "in_progress",
        "paused",
        "completed",
        "cancelled",
      ],
      quote_approval_action: ["approved", "rejected"],
      quote_status: [
        "draft",
        "sent",
        "viewed",
        "approved",
        "rejected",
        "expired",
      ],
      sinapi_reference_kind: ["input", "composition"],
      sinapi_regime: [
        "sem_desoneracao",
        "com_desoneracao",
        "sem_encargos_sociais",
      ],
      sinapi_release_status: ["staging", "published", "superseded", "rejected"],
      stage_status: ["todo", "in_progress", "done"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

export type CompanyRole = Enums<"company_role">
export type ProjectStatus = Enums<"project_status">
export type QuoteStatus = Enums<"quote_status">
export type QuoteApprovalAction = Enums<"quote_approval_action">
export type StageStatus = Enums<"stage_status">
export type CostCategory = Enums<"cost_category">
export type ChargeKind = Enums<"charge_kind">
export type ChargeStatus = Enums<"charge_status">
export type PaymentProvider = "asaas" | "manual_pix"
export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random"
export type SinapiReferenceKind = Enums<"sinapi_reference_kind">
export type SinapiRegime = Enums<"sinapi_regime">
export type SinapiReleaseStatus = Enums<"sinapi_release_status">
