
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
            "allowed_emails": {
                  Row: {
                    "added_at": string,"email": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"email": string,"note"?: string | null
                  }
                  Update: {
                    "added_at"?: string,"email"?: string,"note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"attempt_answers": {
                  Row: {
                    "answered_at": string,"attempt_id": string,"checked": boolean,"is_correct": boolean | null,"marked": boolean,"question_id": string,"selected_key": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string,"attempt_id": string,"checked"?: boolean,"is_correct"?: boolean | null,"marked"?: boolean,"question_id": string,"selected_key"?: string | null
                  }
                  Update: {
                    "answered_at"?: string,"attempt_id"?: string,"checked"?: boolean,"is_correct"?: boolean | null,"marked"?: boolean,"question_id"?: string,"selected_key"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attempt_answers_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attempt_answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"attempts": {
                  Row: {
                    "deadline_at": string | null,"id": string,"mode": Database["public"]['Enums']["attempt_mode"],"n_correct": number | null,"n_skipped": number | null,"n_wrong": number | null,"score": number | null,"started_at": string,"submitted_at": string | null,"test_id": string,"user_id": string,"_is_expired": boolean | null
                  }
                  ComputedFields: "_is_expired"
                  Insert: {
                    "deadline_at"?: string | null,"id"?: string,"mode": Database["public"]['Enums']["attempt_mode"],"n_correct"?: number | null,"n_skipped"?: number | null,"n_wrong"?: number | null,"score"?: number | null,"started_at"?: string,"submitted_at"?: string | null,"test_id": string,"user_id"?: string
                  }
                  Update: {
                    "deadline_at"?: string | null,"id"?: string,"mode"?: Database["public"]['Enums']["attempt_mode"],"n_correct"?: number | null,"n_skipped"?: number | null,"n_wrong"?: number | null,"score"?: number | null,"started_at"?: string,"submitted_at"?: string | null,"test_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attempts_test_id_fkey"
      columns: ["test_id"]
isOneToOne: false
      referencedRelation: "tests"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_progress": {
                  Row: {
                    "completed_at": string,"lesson_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string,"lesson_id": string,"user_id"?: string
                  }
                  Update: {
                    "completed_at"?: string,"lesson_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_progress_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "body_md": string,"created_at": string,"id": string,"position": number,"published": boolean,"published_at": string | null,"slug": string,"title": string,"topic_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_md"?: string,"created_at"?: string,"id"?: string,"position"?: number,"published"?: boolean,"published_at"?: string | null,"slug": string,"title": string,"topic_id": string,"updated_at"?: string
                  }
                  Update: {
                    "body_md"?: string,"created_at"?: string,"id"?: string,"position"?: number,"published"?: boolean,"published_at"?: string | null,"slug"?: string,"title"?: string,"topic_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"questions": {
                  Row: {
                    "correct_key": string,"created_at": string,"difficulty": Database["public"]['Enums']["difficulty"],"explanation_md": string,"id": string,"options": NonNullable<Json>,"slug": string,"source": string | null,"stem_md": string,"tags": (string)[],"topic_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "correct_key": string,"created_at"?: string,"difficulty"?: Database["public"]['Enums']["difficulty"],"explanation_md"?: string,"id"?: string,"options": NonNullable<Json>,"slug": string,"source"?: string | null,"stem_md": string,"tags"?: (string)[],"topic_id": string,"updated_at"?: string
                  }
                  Update: {
                    "correct_key"?: string,"created_at"?: string,"difficulty"?: Database["public"]['Enums']["difficulty"],"explanation_md"?: string,"id"?: string,"options"?: NonNullable<Json>,"slug"?: string,"source"?: string | null,"stem_md"?: string,"tags"?: (string)[],"topic_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"subjects": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"name": string,"position": number,"published": boolean,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"name": string,"position"?: number,"published"?: boolean,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"name"?: string,"position"?: number,"published"?: boolean,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"test_questions": {
                  Row: {
                    "position": number,"question_id": string,"test_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "position": number,"question_id": string,"test_id": string
                  }
                  Update: {
                    "position"?: number,"question_id"?: string,"test_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "test_questions_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_questions_test_id_fkey"
      columns: ["test_id"]
isOneToOne: false
      referencedRelation: "tests"
      referencedColumns: ["id"]
    }
                  ]
                },"tests": {
                  Row: {
                    "created_at": string,"created_by": string | null,"duration_sec": number | null,"id": string,"kind": Database["public"]['Enums']["test_kind"],"marks_correct": number,"marks_wrong": number,"published": boolean,"published_at": string | null,"slug": string | null,"subject_id": string | null,"title": string,"updated_at": string,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"duration_sec"?: number | null,"id"?: string,"kind": Database["public"]['Enums']["test_kind"],"marks_correct"?: number,"marks_wrong"?: number,"published"?: boolean,"published_at"?: string | null,"slug"?: string | null,"subject_id"?: string | null,"title": string,"updated_at"?: string,"year"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"duration_sec"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["test_kind"],"marks_correct"?: number,"marks_wrong"?: number,"published"?: boolean,"published_at"?: string | null,"slug"?: string | null,"subject_id"?: string | null,"title"?: string,"updated_at"?: string,"year"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tests_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"topics": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"name": string,"position": number,"slug": string,"subject_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"name": string,"position"?: number,"slug": string,"subject_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"name"?: string,"position"?: number,"slug"?: string,"subject_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "topics_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_grace":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_is_expired":
{ Args: { "a": Omit<Database["public"]['Tables']["attempts"]['Row'], Database["public"]['Tables']["attempts"]['ComputedFields']> }; Returns: boolean
                           },
"_own_attempt":
{ Args: { "p_attempt_id": string }; Returns: {
              "deadline_at": string | null,
"id": string,
"mode": Database["public"]['Enums']["attempt_mode"],
"n_correct": number | null,
"n_skipped": number | null,
"n_wrong": number | null,
"score": number | null,
"started_at": string,
"submitted_at": string | null,
"test_id": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "attempts"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_custom_test":
{ Args: { "p_count": number,"p_duration_sec"?: number,"p_topic_ids": (string)[] }; Returns: string
                           },
"get_attempt":
{ Args: { "p_attempt_id": string }; Returns: Json
                           },
"get_attempt_review":
{ Args: { "p_attempt_id": string }; Returns: Json
                           },
"save_answer":
{ Args: { "p_attempt_id": string,"p_marked"?: boolean,"p_question_id": string,"p_selected_key": string }; Returns: Json
                           },
"start_attempt":
{ Args: { "p_mode": Database["public"]['Enums']["attempt_mode"],"p_test_id": string }; Returns: string
                           },
"submit_attempt":
{ Args: { "p_attempt_id": string }; Returns: Json
                           },
"submit_expired_attempts":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            "attempt_mode": "timed"|"practice","difficulty": "easy"|"medium"|"hard","test_kind": "mock"|"pyq"|"custom"
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
            "attempt_mode": ["timed", "practice"],"difficulty": ["easy", "medium", "hard"],"test_kind": ["mock", "pyq", "custom"]
          }
        }
} as const
