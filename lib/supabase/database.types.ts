
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
                },"book_chapters": {
                  Row: {
                    "book_id": string,"gist_md": string,"gist_md_hi": string | null,"id": string,"number": number,"position": number,"slug": string,"title": string,"title_hi": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "book_id": string,"gist_md": string,"gist_md_hi"?: string | null,"id"?: string,"number": number,"position"?: number,"slug": string,"title": string,"title_hi"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "book_id"?: string,"gist_md"?: string,"gist_md_hi"?: string | null,"id"?: string,"number"?: number,"position"?: number,"slug"?: string,"title"?: string,"title_hi"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "book_chapters_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    }
                  ]
                },"books": {
                  Row: {
                    "author": string | null,"created_at": string,"description": string,"description_hi": string | null,"edition": string | null,"id": string,"kind": string,"position": number,"published": boolean,"published_at": string | null,"slug": string,"title": string,"title_hi": string | null,"topic_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author"?: string | null,"created_at"?: string,"description"?: string,"description_hi"?: string | null,"edition"?: string | null,"id"?: string,"kind"?: string,"position"?: number,"published"?: boolean,"published_at"?: string | null,"slug": string,"title": string,"title_hi"?: string | null,"topic_id": string,"updated_at"?: string
                  }
                  Update: {
                    "author"?: string | null,"created_at"?: string,"description"?: string,"description_hi"?: string | null,"edition"?: string | null,"id"?: string,"kind"?: string,"position"?: number,"published"?: boolean,"published_at"?: string | null,"slug"?: string,"title"?: string,"title_hi"?: string | null,"topic_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "books_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"ca_categories": {
                  Row: {
                    "name": string,"position": number,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "name": string,"position"?: number,"slug": string
                  }
                  Update: {
                    "name"?: string,"position"?: number,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ca_months": {
                  Row: {
                    "created_at": string,"id": string,"month": string,"published": boolean,"published_at": string | null,"section_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"month": string,"published"?: boolean,"published_at"?: string | null,"section_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"month"?: string,"published"?: boolean,"published_at"?: string | null,"section_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ca_months_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "sections"
      referencedColumns: ["id"]
    }
                  ]
                },"ca_notes": {
                  Row: {
                    "angle_md": string | null,"body_md": string,"category_slug": string,"happened_on": string | null,"id": string,"month_id": string,"position": number,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "angle_md"?: string | null,"body_md": string,"category_slug": string,"happened_on"?: string | null,"id"?: string,"month_id": string,"position"?: number,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "angle_md"?: string | null,"body_md"?: string,"category_slug"?: string,"happened_on"?: string | null,"id"?: string,"month_id"?: string,"position"?: number,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ca_notes_category_slug_fkey"
      columns: ["category_slug"]
isOneToOne: false
      referencedRelation: "ca_categories"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "ca_notes_month_id_fkey"
      columns: ["month_id"]
isOneToOne: false
      referencedRelation: "ca_months"
      referencedColumns: ["id"]
    }
                  ]
                },"ca_progress": {
                  Row: {
                    "category_slug": string,"month_id": string,"read_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_slug": string,"month_id": string,"read_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "category_slug"?: string,"month_id"?: string,"read_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ca_progress_category_slug_fkey"
      columns: ["category_slug"]
isOneToOne: false
      referencedRelation: "ca_categories"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "ca_progress_month_id_fkey"
      columns: ["month_id"]
isOneToOne: false
      referencedRelation: "ca_months"
      referencedColumns: ["id"]
    }
                  ]
                },"chapter_progress": {
                  Row: {
                    "chapter_id": string,"read_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_id": string,"read_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "chapter_id"?: string,"read_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapter_progress_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "book_chapters"
      referencedColumns: ["id"]
    }
                  ]
                },"chapter_topics": {
                  Row: {
                    "chapter_id": string,"topic_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_id": string,"topic_id": string
                  }
                  Update: {
                    "chapter_id"?: string,"topic_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapter_topics_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "book_chapters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chapter_topics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"exams": {
                  Row: {
                    "description": string,"description_hi": string | null,"name": string,"name_hi": string | null,"position": number,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string,"description_hi"?: string | null,"name": string,"name_hi"?: string | null,"position"?: number,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "description"?: string,"description_hi"?: string | null,"name"?: string,"name_hi"?: string | null,"position"?: number,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
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
                    "body_md": string,"body_md_hi": string | null,"created_at": string,"id": string,"position": number,"published": boolean,"published_at": string | null,"slug": string,"title": string,"title_hi": string | null,"topic_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_md"?: string,"body_md_hi"?: string | null,"created_at"?: string,"id"?: string,"position"?: number,"published"?: boolean,"published_at"?: string | null,"slug": string,"title": string,"title_hi"?: string | null,"topic_id": string,"updated_at"?: string
                  }
                  Update: {
                    "body_md"?: string,"body_md_hi"?: string | null,"created_at"?: string,"id"?: string,"position"?: number,"published"?: boolean,"published_at"?: string | null,"slug"?: string,"title"?: string,"title_hi"?: string | null,"topic_id"?: string,"updated_at"?: string
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
                    "content_lang": string,"created_at": string,"display_name": string | null,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_lang"?: string,"created_at"?: string,"display_name"?: string | null,"id": string
                  }
                  Update: {
                    "content_lang"?: string,"created_at"?: string,"display_name"?: string | null,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"questions": {
                  Row: {
                    "ca_category_slug": string | null,"ca_month_id": string | null,"chapter_id": string | null,"correct_key": string,"created_at": string,"difficulty": Database["public"]['Enums']["difficulty"],"explanation_md": string,"explanation_md_hi": string | null,"id": string,"options": NonNullable<Json>,"options_hi": Json | null,"paper_test_id": string | null,"retired": boolean,"slug": string,"source": string | null,"stem_md": string,"stem_md_hi": string | null,"tags": (string)[],"topic_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ca_category_slug"?: string | null,"ca_month_id"?: string | null,"chapter_id"?: string | null,"correct_key": string,"created_at"?: string,"difficulty"?: Database["public"]['Enums']["difficulty"],"explanation_md"?: string,"explanation_md_hi"?: string | null,"id"?: string,"options": NonNullable<Json>,"options_hi"?: Json | null,"paper_test_id"?: string | null,"retired"?: boolean,"slug": string,"source"?: string | null,"stem_md": string,"stem_md_hi"?: string | null,"tags"?: (string)[],"topic_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "ca_category_slug"?: string | null,"ca_month_id"?: string | null,"chapter_id"?: string | null,"correct_key"?: string,"created_at"?: string,"difficulty"?: Database["public"]['Enums']["difficulty"],"explanation_md"?: string,"explanation_md_hi"?: string | null,"id"?: string,"options"?: NonNullable<Json>,"options_hi"?: Json | null,"paper_test_id"?: string | null,"retired"?: boolean,"slug"?: string,"source"?: string | null,"stem_md"?: string,"stem_md_hi"?: string | null,"tags"?: (string)[],"topic_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_ca_category_slug_fkey"
      columns: ["ca_category_slug"]
isOneToOne: false
      referencedRelation: "ca_categories"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "questions_ca_month_id_fkey"
      columns: ["ca_month_id"]
isOneToOne: false
      referencedRelation: "ca_months"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "book_chapters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_paper_test_id_fkey"
      columns: ["paper_test_id"]
isOneToOne: false
      referencedRelation: "tests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"sections": {
                  Row: {
                    "created_at": string,"id": string,"kind": Database["public"]['Enums']["section_kind"],"name": string,"position": number,"slug": string,"subject_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["section_kind"],"name": string,"position"?: number,"slug": string,"subject_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["section_kind"],"name"?: string,"position"?: number,"slug"?: string,"subject_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sections_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"subjects": {
                  Row: {
                    "created_at": string,"description": string,"description_hi": string | null,"id": string,"name": string,"name_hi": string | null,"position": number,"published": boolean,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"description_hi"?: string | null,"id"?: string,"name": string,"name_hi"?: string | null,"position"?: number,"published"?: boolean,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"description_hi"?: string | null,"id"?: string,"name"?: string,"name_hi"?: string | null,"position"?: number,"published"?: boolean,"slug"?: string,"updated_at"?: string
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
                    "book_id": string | null,"ca_month_id": string | null,"chapter_id": string | null,"created_at": string,"created_by": string | null,"duration_sec": number | null,"exam_slug": string | null,"id": string,"kind": Database["public"]['Enums']["test_kind"],"marks_correct": number,"marks_wrong": number,"paper_date": string | null,"paper_label": string | null,"published": boolean,"published_at": string | null,"slug": string | null,"subject_id": string | null,"title": string,"title_hi": string | null,"updated_at": string,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "book_id"?: string | null,"ca_month_id"?: string | null,"chapter_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"duration_sec"?: number | null,"exam_slug"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["test_kind"],"marks_correct"?: number,"marks_wrong"?: number,"paper_date"?: string | null,"paper_label"?: string | null,"published"?: boolean,"published_at"?: string | null,"slug"?: string | null,"subject_id"?: string | null,"title": string,"title_hi"?: string | null,"updated_at"?: string,"year"?: number | null
                  }
                  Update: {
                    "book_id"?: string | null,"ca_month_id"?: string | null,"chapter_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"duration_sec"?: number | null,"exam_slug"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["test_kind"],"marks_correct"?: number,"marks_wrong"?: number,"paper_date"?: string | null,"paper_label"?: string | null,"published"?: boolean,"published_at"?: string | null,"slug"?: string | null,"subject_id"?: string | null,"title"?: string,"title_hi"?: string | null,"updated_at"?: string,"year"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tests_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tests_ca_month_id_fkey"
      columns: ["ca_month_id"]
isOneToOne: false
      referencedRelation: "ca_months"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tests_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "book_chapters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tests_exam_slug_fkey"
      columns: ["exam_slug"]
isOneToOne: false
      referencedRelation: "exams"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "tests_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"topics": {
                  Row: {
                    "created_at": string,"description": string,"description_hi": string | null,"id": string,"name": string,"name_hi": string | null,"parent_id": string | null,"path": string,"position": number,"section_id": string | null,"slug": string,"subject_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"description_hi"?: string | null,"id"?: string,"name": string,"name_hi"?: string | null,"parent_id"?: string | null,"path": string,"position"?: number,"section_id"?: string | null,"slug": string,"subject_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"description_hi"?: string | null,"id"?: string,"name"?: string,"name_hi"?: string | null,"parent_id"?: string | null,"path"?: string,"position"?: number,"section_id"?: string | null,"slug"?: string,"subject_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "topics_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "topics_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "sections"
      referencedColumns: ["id"]
    },{
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
{ Args: { "p_chapter_ids"?: (string)[],"p_count": number,"p_duration_sec"?: number,"p_topic_ids": (string)[] }; Returns: string
                           },
"create_period_test":
{ Args: { "p_categories"?: (string)[],"p_count"?: number,"p_from": string,"p_seconds_per_question"?: number,"p_to": string }; Returns: string
                           },
"get_attempt":
{ Args: { "p_attempt_id": string }; Returns: Json
                           },
"get_attempt_review":
{ Args: { "p_attempt_id": string }; Returns: Json
                           },
"hook_check_allowlist":
{ Args: { "event": Json }; Returns: Json
                           },
"replace_test_questions":
{ Args: { "p_question_ids": (string)[],"p_test_id": string }; Returns: undefined
                           },
"save_answer":
{ Args: { "p_attempt_id": string,"p_marked"?: boolean,"p_question_id": string,"p_selected_key": string }; Returns: Json
                           },
"search_content":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "body": string,"body_hi": string,"book_slug": string,"course_slug": string,"item_slug": string,"kind": string,"node_path": string,"number": number,"rank": number,"title": string,"title_hi": string
            }[]
                           },
"search_fold":
{ Args: { "t": string }; Returns: string
                           },
"set_marked":
{ Args: { "p_attempt_id": string,"p_marked": boolean,"p_question_id": string }; Returns: undefined
                           },
"start_attempt":
{ Args: { "p_mode": Database["public"]['Enums']["attempt_mode"],"p_test_id": string }; Returns: string
                           },
"submit_attempt":
{ Args: { "p_attempt_id": string }; Returns: Json
                           },
"submit_expired_attempts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"topic_subtree":
{ Args: { "p_topic_id": string }; Returns: string[]
                           }
          }
          Enums: {
            "attempt_mode": "timed"|"practice","difficulty": "easy"|"medium"|"hard","section_kind": "topics"|"current_affairs","test_kind": "mock"|"pyq"|"custom"|"chapter"
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
            "attempt_mode": ["timed", "practice"],"difficulty": ["easy", "medium", "hard"],"section_kind": ["topics", "current_affairs"],"test_kind": ["mock", "pyq", "custom", "chapter"]
          }
        }
} as const
