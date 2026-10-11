
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "books": {
                  Row: {
                    "authors": (string)[],"cover_url": string | null,"created_at": string,"created_by": string | null,"description": string | null,"details_checked": boolean,"google_rating": number | null,"google_ratings_count": number | null,"id": string,"isbn": string | null,"published_year": number | null,"source": Database["public"]['Enums']["book_source"],"source_id": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "authors"?: (string)[],"cover_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"details_checked"?: boolean,"google_rating"?: number | null,"google_ratings_count"?: number | null,"id"?: string,"isbn"?: string | null,"published_year"?: number | null,"source": Database["public"]['Enums']["book_source"],"source_id"?: string | null,"title": string
                  }
                  Update: {
                    "authors"?: (string)[],"cover_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"details_checked"?: boolean,"google_rating"?: number | null,"google_ratings_count"?: number | null,"id"?: string,"isbn"?: string | null,"published_year"?: number | null,"source"?: Database["public"]['Enums']["book_source"],"source_id"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "books_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"feedback": {
                  Row: {
                    "app_version": string,"created_at": string,"id": number,"message": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "app_version"?: string,"created_at"?: string,"id"?: never,"message": string,"user_id"?: string | null
                  }
                  Update: {
                    "app_version"?: string,"created_at"?: string,"id"?: never,"message"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"role": Database["public"]['Enums']["app_role"],"username": string | null,"username_changed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id": string,"role"?: Database["public"]['Enums']["app_role"],"username"?: string | null,"username_changed_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"role"?: Database["public"]['Enums']["app_role"],"username"?: string | null,"username_changed_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"reading_pledges": {
                  Row: {
                    "goal": number,"updated_at": string,"user_id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "goal": number,"updated_at"?: string,"user_id"?: string,"year": number
                  }
                  Update: {
                    "goal"?: number,"updated_at"?: string,"user_id"?: string,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "reading_pledges_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reads": {
                  Row: {
                    "book_id": string,"created_at": string,"finished_on": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "book_id": string,"created_at"?: string,"finished_on"?: string,"id"?: never,"user_id"?: string
                  }
                  Update: {
                    "book_id"?: string,"created_at"?: string,"finished_on"?: string,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reads_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_books": {
                  Row: {
                    "book_id": string,"created_at": string,"progress": number | null,"status": Database["public"]['Enums']["book_status"],"status_changed_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "book_id": string,"created_at"?: string,"progress"?: number | null,"status": Database["public"]['Enums']["book_status"],"status_changed_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "book_id"?: string,"created_at"?: string,"progress"?: number | null,"status"?: Database["public"]['Enums']["book_status"],"status_changed_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_books_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_books_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_manual_book":
{ Args: { "p_authors": (string)[],"p_description"?: string,"p_isbn"?: string,"p_status": Database["public"]['Enums']["book_status"],"p_title": string }; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_reserved_username":
{ Args: { "name": string }; Returns: boolean
                           },
"mark_book_read":
{ Args: { "p_book_id": string,"p_finished_on"?: string }; Returns: number
                           },
"purge_deleted_accounts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"remove_my_book":
{ Args: { "p_book_id": string }; Returns: Json
                           },
"request_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"restore_my_book":
{ Args: { "p_book_id": string,"p_snapshot": Json }; Returns: undefined
                           },
"save_external_book":
{ Args: { "p_authors"?: (string)[],"p_cover_url"?: string,"p_description"?: string,"p_details_checked"?: boolean,"p_google_rating"?: number,"p_google_ratings_count"?: number,"p_isbn"?: string,"p_published_year"?: number,"p_source": Database["public"]['Enums']["book_source"],"p_source_id": string,"p_title": string }; Returns: string
                           },
"save_external_books":
{ Args: { "p_books": Json }; Returns: (string)[]
                           },
"set_book_status":
{ Args: { "p_book_id": string,"p_progress"?: number,"p_status": Database["public"]['Enums']["book_status"] }; Returns: undefined
                           },
"undo_mark_book_read":
{ Args: { "p_previous_progress"?: number,"p_previous_status"?: Database["public"]['Enums']["book_status"],"p_read_id": number }; Returns: undefined
                           },
"username_available":
{ Args: { "name": string }; Returns: boolean
                           }
          }
          Enums: {
            "app_role": "user"|"admin","book_source": "openlibrary"|"google"|"manual","book_status": "want_to_read"|"reading"|"read"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["user", "admin"],"book_source": ["openlibrary", "google", "manual"],"book_status": ["want_to_read", "reading", "read"]
          }
        }
} as const
