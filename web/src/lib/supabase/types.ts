/**
 * Tipos do banco — hand-written.
 *
 * Para regenerar a partir do schema real do Supabase:
 *   npx supabase gen types typescript --project-id <PROJECT_ID> --schema public > src/lib/supabase/types.ts
 *
 * Sempre que mudar uma migration, rode o comando acima e substitua este arquivo.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CompanyRole = "owner" | "manager" | "foreman" | "worker";
export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled";
export type QuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "approved"
  | "rejected"
  | "expired";
export type QuoteApprovalAction = "approved" | "rejected";
export type StageStatus = "todo" | "in_progress" | "done";
export type CostCategory = "material" | "labor" | "freight" | "other";
export type ChargeKind = "entrada" | "saldo";
export type PaymentProvider = "asaas" | "manual_pix";
export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random";
export type ChargeStatus =
  | "draft"
  | "pending"
  | "overdue"
  | "received"
  | "confirmed"
  | "cancelled";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          cnpj: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          payment_provider: PaymentProvider;
          pix_key_type: PixKeyType | null;
          pix_key: string | null;
          pix_receiver_name: string | null;
          pix_receiver_city: string | null;
          pix_instructions: string | null;
          plan: string;
          saas_asaas_customer_id: string | null;
          saas_asaas_subscription_id: string | null;
          saas_asaas_subscription_plan: string | null;
          saas_pending_payment_link_id: string | null;
          saas_pending_payment_link_url: string | null;
          saas_pending_plan: string | null;
          saas_pending_checkout_token: string | null;
          saas_pending_checkout_started_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          cnpj?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          payment_provider?: PaymentProvider;
          pix_key_type?: PixKeyType | null;
          pix_key?: string | null;
          pix_receiver_name?: string | null;
          pix_receiver_city?: string | null;
          pix_instructions?: string | null;
          plan?: string;
          saas_asaas_customer_id?: string | null;
          saas_asaas_subscription_id?: string | null;
          saas_asaas_subscription_plan?: string | null;
          saas_pending_payment_link_id?: string | null;
          saas_pending_payment_link_url?: string | null;
          saas_pending_plan?: string | null;
          saas_pending_checkout_token?: string | null;
          saas_pending_checkout_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      company_members: {
        Row: {
          company_id: string;
          user_id: string;
          role: CompanyRole;
          created_at: string;
        };
        Insert: {
          company_id: string;
          user_id: string;
          role?: CompanyRole;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["company_members"]["Insert"]
        >;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          document: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          document?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          company_id: string;
          customer_id: string;
          name: string;
          description: string | null;
          address: string | null;
          status: ProjectStatus;
          starts_on: string | null;
          ends_on: string | null;
          budget_cents: number | null;
          template_id: string | null;
          progress_pct: number | null;
          last_diary_at: string | null;
          entry_pct: number | null;
          delivery_approved_at: string | null;
          delivery_approved_token: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_id: string;
          name: string;
          description?: string | null;
          address?: string | null;
          status?: ProjectStatus;
          starts_on?: string | null;
          ends_on?: string | null;
          budget_cents?: number | null;
          template_id?: string | null;
          progress_pct?: number | null;
          last_diary_at?: string | null;
          entry_pct?: number | null;
          delivery_approved_at?: string | null;
          delivery_approved_token?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          company_id: string;
          customer_id: string;
          project_id: string | null;
          revision_source_id: string | null;
          number: string;
          title: string;
          description: string | null;
          status: QuoteStatus;
          subtotal_cents: number;
          discount_cents: number;
          total_cents: number;
          valid_until: string | null;
          share_token: string | null;
          sent_at: string | null;
          viewed_at: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          notes: string | null;
          pdf_storage_path: string | null;
          pdf_generated_at: string | null;
          notification_sent_at: string | null;
          whatsapp_sent_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_id: string;
          project_id?: string | null;
          revision_source_id?: string | null;
          number: string;
          title: string;
          description?: string | null;
          status?: QuoteStatus;
          subtotal_cents?: number;
          discount_cents?: number;
          total_cents?: number;
          valid_until?: string | null;
          share_token?: string | null;
          sent_at?: string | null;
          viewed_at?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          notes?: string | null;
          pdf_storage_path?: string | null;
          pdf_generated_at?: string | null;
          notification_sent_at?: string | null;
          whatsapp_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["quotes"]["Insert"]>;
        Relationships: [];
      };
      quote_items: {
        Row: {
          id: string;
          quote_id: string;
          company_id: string;
          position: number;
          description: string;
          unit: string;
          quantity: number;
          unit_price_cents: number;
          total_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          company_id: string;
          position?: number;
          description: string;
          unit?: string;
          quantity?: number;
          unit_price_cents?: number;
          total_cents?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["quote_items"]["Insert"]
        >;
        Relationships: [];
      };
      catalog_items: {
        Row: {
          id: string;
          company_id: string;
          description: string;
          unit: string;
          default_price_cents: number;
          usage_count: number;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          description: string;
          unit?: string;
          default_price_cents?: number;
          usage_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["catalog_items"]["Insert"]
        >;
        Relationships: [];
      };
      quote_approvals: {
        Row: {
          id: string;
          quote_id: string;
          company_id: string;
          action: QuoteApprovalAction;
          signer_name: string;
          rejection_reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          company_id: string;
          action: QuoteApprovalAction;
          signer_name: string;
          rejection_reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["quote_approvals"]["Insert"]
        >;
        Relationships: [];
      };
      quote_sequences: {
        Row: {
          company_id: string;
          year: number;
          last_num: number;
        };
        Insert: {
          company_id: string;
          year: number;
          last_num?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["quote_sequences"]["Insert"]
        >;
        Relationships: [];
      };
      stage_templates: {
        Row: {
          id: string;
          company_id: string | null;
          name: string;
          description: string | null;
          is_system: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          name: string;
          description?: string | null;
          is_system?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["stage_templates"]["Insert"]
        >;
        Relationships: [];
      };
      stage_template_items: {
        Row: {
          id: string;
          template_id: string;
          position: number;
          name: string;
          est_days: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          position?: number;
          name: string;
          est_days?: number | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["stage_template_items"]["Insert"]
        >;
        Relationships: [];
      };
      project_stages: {
        Row: {
          id: string;
          project_id: string;
          company_id: string;
          position: number;
          name: string;
          status: StageStatus;
          est_days: number | null;
          started_on: string | null;
          completed_on: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          company_id: string;
          position?: number;
          name: string;
          status?: StageStatus;
          est_days?: number | null;
          started_on?: string | null;
          completed_on?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_stages"]["Insert"]
        >;
        Relationships: [];
      };
      diary_entries: {
        Row: {
          id: string;
          project_id: string;
          company_id: string;
          author_id: string | null;
          body: string;
          weather: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          company_id: string;
          author_id?: string | null;
          body?: string;
          weather?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["diary_entries"]["Insert"]
        >;
        Relationships: [];
      };
      diary_photos: {
        Row: {
          id: string;
          entry_id: string;
          project_id: string;
          company_id: string;
          storage_path: string;
          width: number | null;
          height: number | null;
          size_bytes: number;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          entry_id: string;
          project_id: string;
          company_id: string;
          storage_path: string;
          width?: number | null;
          height?: number | null;
          size_bytes: number;
          position?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["diary_photos"]["Insert"]
        >;
        Relationships: [];
      };
      project_costs: {
        Row: {
          id: string;
          project_id: string;
          company_id: string;
          stage_id: string | null;
          category: CostCategory;
          description: string;
          amount_cents: number;
          incurred_on: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          company_id: string;
          stage_id?: string | null;
          category: CostCategory;
          description: string;
          amount_cents: number;
          incurred_on?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_costs"]["Insert"]
        >;
        Relationships: [];
      };
      time_entries: {
        Row: {
          id: string;
          project_id: string;
          company_id: string;
          worker_name: string;
          worker_role: string | null;
          worked_on: string;
          started_at: string;
          ended_at: string | null;
          hours_worked: number | null;
          gps_lat: number | null;
          gps_lng: number | null;
          gps_accuracy_m: number | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          company_id: string;
          worker_name: string;
          worker_role?: string | null;
          worked_on?: string;
          started_at: string;
          ended_at?: string | null;
          hours_worked?: number | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          gps_accuracy_m?: number | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["time_entries"]["Insert"]
        >;
        Relationships: [];
      };
      customer_billing_profiles: {
        Row: {
          id: string;
          customer_id: string;
          company_id: string;
          asaas_customer_id: string;
          cpf_cnpj: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          company_id: string;
          asaas_customer_id: string;
          cpf_cnpj: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_billing_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      billing_charges: {
        Row: {
          id: string;
          project_id: string;
          company_id: string;
          customer_id: string;
          kind: ChargeKind;
          status: ChargeStatus;
          amount_cents: number;
          payment_provider: PaymentProvider;
          asaas_payment_id: string | null;
          pix_qr_code: string | null;
          pix_qr_image_b64: string | null;
          invoice_url: string | null;
          due_date: string | null;
          paid_at: string | null;
          paid_manually_at: string | null;
          paid_manually_by: string | null;
          manual_payment_note: string | null;
          released_at: string | null;
          released_by_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          company_id: string;
          customer_id: string;
          kind: ChargeKind;
          status?: ChargeStatus;
          amount_cents: number;
          payment_provider?: PaymentProvider;
          asaas_payment_id?: string | null;
          pix_qr_code?: string | null;
          pix_qr_image_b64?: string | null;
          invoice_url?: string | null;
          due_date?: string | null;
          paid_at?: string | null;
          paid_manually_at?: string | null;
          paid_manually_by?: string | null;
          manual_payment_note?: string | null;
          released_at?: string | null;
          released_by_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_charges"]["Insert"]
        >;
        Relationships: [];
      };
      billing_webhook_events: {
        Row: {
          id: string;
          asaas_event_id: string;
          event_type: string;
          asaas_payment_id: string | null;
          raw_payload: Json;
          processed_at: string | null;
          processing_error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          asaas_event_id: string;
          event_type: string;
          asaas_payment_id?: string | null;
          raw_payload: Json;
          processed_at?: string | null;
          processing_error?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_webhook_events"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      user_company_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      user_role_in: {
        Args: { p_company_id: string };
        Returns: CompanyRole;
      };
      next_quote_number: {
        Args: { p_company_id: string };
        Returns: string;
      };
      replace_quote_items: {
        Args: {
          p_quote_id: string;
          p_company_id: string;
          p_title: string;
          p_description: string | null;
          p_customer_id: string;
          p_valid_until: string | null;
          p_notes: string | null;
          p_items: Json;
        };
        Returns: void;
      };
      insert_diary_entry: {
        Args: {
          p_project_id: string;
          p_company_id: string;
          p_body: string;
          p_photos: Json;
        };
        Returns: string;
      };
      instantiate_template_stages: {
        Args: {
          p_project_id: string;
          p_company_id: string;
          p_template_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      company_role: CompanyRole;
      project_status: ProjectStatus;
      quote_status: QuoteStatus;
      quote_approval_action: QuoteApprovalAction;
      stage_status: StageStatus;
      cost_category: CostCategory;
      charge_kind: ChargeKind;
      charge_status: ChargeStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
