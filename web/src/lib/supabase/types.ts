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
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_id: string;
          project_id?: string | null;
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
    };
    Enums: {
      company_role: CompanyRole;
      project_status: ProjectStatus;
      quote_status: QuoteStatus;
      quote_approval_action: QuoteApprovalAction;
    };
    CompositeTypes: Record<string, never>;
  };
}
