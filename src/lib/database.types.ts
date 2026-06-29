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
      ad_spend_daily: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          adgroup_id: string | null
          adgroup_name: string | null
          advertiser_id: string
          bc_config_id: string
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          conversion_value: number | null
          conversions: number | null
          cost_per_conversion: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          dia: string
          id: string
          impressions: number | null
          spend: number
          workspace_id: string
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          adgroup_id?: string | null
          adgroup_name?: string | null
          advertiser_id: string
          bc_config_id: string
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          dia: string
          id?: string
          impressions?: number | null
          spend?: number
          workspace_id: string
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          adgroup_id?: string | null
          adgroup_name?: string | null
          advertiser_id?: string
          bc_config_id?: string
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          dia?: string
          id?: string
          impressions?: number | null
          spend?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_spend_daily_bc_config_id_fkey"
            columns: ["bc_config_id"]
            isOneToOne: false
            referencedRelation: "bc_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_spend_daily_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_accounts: {
        Row: {
          advertiser_id: string
          balance: number | null
          bc_config_id: string
          created_at: string
          currency: string | null
          id: string
          last_balance_sync: string | null
          nome: string | null
          status: string | null
          timezone: string | null
          workspace_id: string
        }
        Insert: {
          advertiser_id: string
          balance?: number | null
          bc_config_id: string
          created_at?: string
          currency?: string | null
          id?: string
          last_balance_sync?: string | null
          nome?: string | null
          status?: string | null
          timezone?: string | null
          workspace_id: string
        }
        Update: {
          advertiser_id?: string
          balance?: number | null
          bc_config_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          last_balance_sync?: string | null
          nome?: string | null
          status?: string | null
          timezone?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_accounts_bc_config_id_fkey"
            columns: ["bc_config_id"]
            isOneToOne: false
            referencedRelation: "bc_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertiser_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_alerts: {
        Row: {
          advertiser_id: string
          balance_snapshot: number | null
          bc_config_id: string
          created_at: string
          id: string
          resolvido: boolean | null
          threshold: number | null
          workspace_id: string
        }
        Insert: {
          advertiser_id: string
          balance_snapshot?: number | null
          bc_config_id: string
          created_at?: string
          id?: string
          resolvido?: boolean | null
          threshold?: number | null
          workspace_id: string
        }
        Update: {
          advertiser_id?: string
          balance_snapshot?: number | null
          bc_config_id?: string
          created_at?: string
          id?: string
          resolvido?: boolean | null
          threshold?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_alerts_bc_config_id_fkey"
            columns: ["bc_config_id"]
            isOneToOne: false
            referencedRelation: "bc_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bc_configs: {
        Row: {
          access_token: string
          apelido: string
          ativo: boolean
          bc_id: string
          created_at: string
          id: string
          last_sync: string | null
          proxy_url: string | null
          sync_error: string | null
          sync_status: string | null
          workspace_id: string
        }
        Insert: {
          access_token: string
          apelido: string
          ativo?: boolean
          bc_id: string
          created_at?: string
          id?: string
          last_sync?: string | null
          proxy_url?: string | null
          sync_error?: string | null
          sync_status?: string | null
          workspace_id: string
        }
        Update: {
          access_token?: string
          apelido?: string
          ativo?: boolean
          bc_id?: string
          created_at?: string
          id?: string
          last_sync?: string | null
          proxy_url?: string | null
          sync_error?: string | null
          sync_status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bc_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversions: {
        Row: {
          categoria: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          dia: string | null
          external_id: string | null
          id: string
          moeda: string | null
          payment_method: string | null
          payment_platform: string | null
          produto: string | null
          session_id: string | null
          status: string
          tiktok_event_response: Json | null
          tiktok_event_sent: boolean | null
          tiktok_event_sent_at: string | null
          ttclid: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          valor: number
          workspace_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          dia?: string | null
          external_id?: string | null
          id?: string
          moeda?: string | null
          payment_method?: string | null
          payment_platform?: string | null
          produto?: string | null
          session_id?: string | null
          status: string
          tiktok_event_response?: Json | null
          tiktok_event_sent?: boolean | null
          tiktok_event_sent_at?: string | null
          ttclid?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          valor: number
          workspace_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          dia?: string | null
          external_id?: string | null
          id?: string
          moeda?: string | null
          payment_method?: string | null
          payment_platform?: string | null
          produto?: string | null
          session_id?: string | null
          status?: string
          tiktok_event_response?: Json | null
          tiktok_event_sent?: boolean | null
          tiktok_event_sent_at?: string | null
          ttclid?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          valor?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_scores: {
        Row: {
          ad_id: string
          ad_name: string | null
          advertiser_id: string
          conversions: number | null
          id: string
          periodo_dias: number
          roas: number | null
          score_cpm: number | null
          score_ctr: number | null
          score_roas: number | null
          score_total: number | null
          spend_total: number | null
          tier: string | null
          trend: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ad_id: string
          ad_name?: string | null
          advertiser_id: string
          conversions?: number | null
          id?: string
          periodo_dias?: number
          roas?: number | null
          score_cpm?: number | null
          score_ctr?: number | null
          score_roas?: number | null
          score_total?: number | null
          spend_total?: number | null
          tier?: string | null
          trend?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ad_id?: string
          ad_name?: string | null
          advertiser_id?: string
          conversions?: number | null
          id?: string
          periodo_dias?: number
          roas?: number | null
          score_cpm?: number | null
          score_ctr?: number | null
          score_roas?: number | null
          score_total?: number | null
          spend_total?: number | null
          tier?: string | null
          trend?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_scores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_summary: {
        Row: {
          custo_produto: number | null
          dia: string
          gasto_ads: number | null
          id: string
          lucro_liquido: number | null
          margem: number | null
          receita_bruta: number | null
          roas: number | null
          updated_at: string
          vendas_count: number | null
          workspace_id: string
        }
        Insert: {
          custo_produto?: number | null
          dia: string
          gasto_ads?: number | null
          id?: string
          lucro_liquido?: number | null
          margem?: number | null
          receita_bruta?: number | null
          roas?: number | null
          updated_at?: string
          vendas_count?: number | null
          workspace_id: string
        }
        Update: {
          custo_produto?: number | null
          dia?: string
          gasto_ads?: number | null
          id?: string
          lucro_liquido?: number | null
          margem?: number | null
          receita_bruta?: number | null
          roas?: number | null
          updated_at?: string
          vendas_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_summary_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_log: {
        Row: {
          conteudo: string
          created_at: string
          dia: string
          id: string
          linked_entity: string | null
          tipo: string | null
          titulo: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          dia: string
          id?: string
          linked_entity?: string | null
          tipo?: string | null
          titulo?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          dia?: string
          id?: string
          linked_entity?: string | null
          tipo?: string | null
          titulo?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          converteu: boolean | null
          created_at: string
          fbclid: string | null
          id: string
          ip: string | null
          landing_url: string | null
          referer: string | null
          session_id: string
          ttclid: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          workspace_id: string
        }
        Insert: {
          converteu?: boolean | null
          created_at?: string
          fbclid?: string | null
          id?: string
          ip?: string | null
          landing_url?: string | null
          referer?: string | null
          session_id: string
          ttclid?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          workspace_id: string
        }
        Update: {
          converteu?: boolean | null
          created_at?: string
          fbclid?: string | null
          id?: string
          ip?: string | null
          landing_url?: string | null
          referer?: string | null
          session_id?: string
          ttclid?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prefs: {
        Row: {
          alerta_saldo: number | null
          custo_produto: number | null
          filtros: Json | null
          id: string
          meta_mensal_brl: number | null
          tema: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          alerta_saldo?: number | null
          custo_produto?: number | null
          filtros?: Json | null
          id?: string
          meta_mensal_brl?: number | null
          tema?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          alerta_saldo?: number | null
          custo_produto?: number | null
          filtros?: Json | null
          id?: string
          meta_mensal_brl?: number | null
          tema?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_prefs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          fuso: string
          id: string
          logo_url: string | null
          moeda: string
          nome: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fuso?: string
          id?: string
          logo_url?: string | null
          moeda?: string
          nome: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fuso?: string
          id?: string
          logo_url?: string | null
          moeda?: string
          nome?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
