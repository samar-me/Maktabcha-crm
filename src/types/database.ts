export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StudentStatus = "Faol" | "Ta’til" | "Bitirgan" | "Tark etgan";
export type GroupStatus = "Faol" | "Yopilgan" | "Rejalashtirilgan";
export type GroupStudentStatus = "Faol" | "Chiqib ketgan";
export type LessonStatus = "Rejalashtirilgan" | "O‘tkazildi" | "Bekor qilindi";
export type AttendanceStatus = "Keldi" | "Kelmadi" | "Kechikdi" | "Sababli";
export type HomeworkStatus = "Berildi" | "Bajarildi" | "Qisman" | "Bajarilmadi";
export type PaymentMethod = "Naqd" | "Karta" | "O‘tkazma" | "Boshqa";
export type UserRole = "admin" | "teacher" | "staff";

export interface ScheduleItem {
  day: string; // e.g. "Dushanba"
  start_time: string; // e.g. "07:00"
  end_time: string; // e.g. "09:00"
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          first_name: string;
          last_name: string | null;
          phone: string | null;
          parent_name: string | null;
          parent_phone: string | null;
          birth_date: string | null;
          gender: "Erkak" | "Ayol" | null;
          address: string | null;
          joined_at: string;
          status: StudentStatus;
          notes: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name?: string | null;
          phone?: string | null;
          parent_name?: string | null;
          parent_phone?: string | null;
          birth_date?: string | null;
          gender?: "Erkak" | "Ayol" | null;
          address?: string | null;
          joined_at?: string;
          status?: StudentStatus;
          notes?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string | null;
          phone?: string | null;
          parent_name?: string | null;
          parent_phone?: string | null;
          birth_date?: string | null;
          gender?: "Erkak" | "Ayol" | null;
          address?: string | null;
          joined_at?: string;
          status?: StudentStatus;
          notes?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          course_name: string;
          teacher_name: string;
          teacher_phone: string | null;
          monthly_fee: number;
          room: string | null;
          schedule: ScheduleItem[];
          start_date: string;
          end_date: string | null;
          status: GroupStatus;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          course_name: string;
          teacher_name: string;
          teacher_phone?: string | null;
          monthly_fee?: number;
          room?: string | null;
          schedule?: ScheduleItem[];
          start_date?: string;
          end_date?: string | null;
          status?: GroupStatus;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          course_name?: string;
          teacher_name?: string;
          teacher_phone?: string | null;
          monthly_fee?: number;
          room?: string | null;
          schedule?: ScheduleItem[];
          start_date?: string;
          end_date?: string | null;
          status?: GroupStatus;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_students: {
        Row: {
          id: string;
          group_id: string;
          student_id: string;
          joined_at: string;
          status: GroupStudentStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          student_id: string;
          joined_at?: string;
          status?: GroupStudentStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          student_id?: string;
          joined_at?: string;
          status?: GroupStudentStatus;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          group_id: string;
          date: string;
          start_time: string;
          end_time: string;
          topic: string;
          description: string | null;
          homework: string | null;
          status: LessonStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          date: string;
          start_time: string;
          end_time: string;
          topic: string;
          description?: string | null;
          homework?: string | null;
          status?: LessonStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          topic?: string;
          description?: string | null;
          homework?: string | null;
          status?: LessonStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          lesson_id: string;
          student_id: string;
          group_id: string;
          date: string;
          status: AttendanceStatus;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          student_id: string;
          group_id: string;
          date: string;
          status: AttendanceStatus;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          student_id?: string;
          group_id?: string;
          date?: string;
          status?: AttendanceStatus;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      homework: {
        Row: {
          id: string;
          group_id: string;
          lesson_id: string | null;
          title: string;
          description: string | null;
          assigned_date: string;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          lesson_id?: string | null;
          title: string;
          description?: string | null;
          assigned_date?: string;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          lesson_id?: string | null;
          title?: string;
          description?: string | null;
          assigned_date?: string;
          due_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      homework_submissions: {
        Row: {
          id: string;
          homework_id: string;
          student_id: string;
          status: HomeworkStatus;
          score: number | null;
          feedback: string | null;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          homework_id: string;
          student_id: string;
          status?: HomeworkStatus;
          score?: number | null;
          feedback?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          homework_id?: string;
          student_id?: string;
          status?: HomeworkStatus;
          score?: number | null;
          feedback?: string | null;
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      grades: {
        Row: {
          id: string;
          student_id: string;
          group_id: string;
          lesson_id: string | null;
          title: string;
          score: number;
          max_score: number;
          date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          group_id: string;
          lesson_id?: string | null;
          title: string;
          score: number;
          max_score?: number;
          date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          group_id?: string;
          lesson_id?: string | null;
          title?: string;
          score?: number;
          max_score?: number;
          date?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          group_id: string;
          amount: number;
          payment_date: string;
          payment_method: PaymentMethod;
          month: number; // 1-12
          year: number; // e.g. 2025
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          group_id: string;
          amount: number;
          payment_date?: string;
          payment_method?: PaymentMethod;
          month: number;
          year: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          group_id?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: PaymentMethod;
          month?: number;
          year?: number;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          id: string;
          center_name: string;
          logo_url: string | null;
          admin_name: string;
          default_currency: string;
          default_monthly_fee: number;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          center_name?: string;
          logo_url?: string | null;
          admin_name?: string;
          default_currency?: string;
          default_monthly_fee?: number;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          center_name?: string;
          logo_url?: string | null;
          admin_name?: string;
          default_currency?: string;
          default_monthly_fee?: number;
          phone?: string | null;
          address?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      personal_auth: {
        Row: {
          id: string;
          pin_hash: string;
          pin_salt: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pin_hash: string;
          pin_salt: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pin_hash?: string;
          pin_salt?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      telegram_group_links: {
        Row: {
          id: string;
          group_id: string;
          telegram_chat_id: number;
          telegram_chat_title: string;
          status: "Faol" | "Uzilgan";
          connected_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          telegram_chat_id: number;
          telegram_chat_title: string;
          status?: "Faol" | "Uzilgan";
          connected_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          telegram_chat_id?: number;
          telegram_chat_title?: string;
          status?: "Faol" | "Uzilgan";
          connected_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      telegram_group_connect_codes: {
        Row: {
          id: string;
          group_id: string;
          code_hash: string;
          plain_code: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          code_hash: string;
          plain_code: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          code_hash?: string;
          plain_code?: string;
          expires_at?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      student_credentials: {
        Row: {
          student_id: string;
          password_hash: string;
          password_salt: string;
          password_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          student_id: string;
          password_hash: string;
          password_salt: string;
          password_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          student_id?: string;
          password_hash?: string;
          password_salt?: string;
          password_version?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          group_id: string;
          title: string;
          description: string | null;
          public_token: string;
          status: "Qoralama" | "Faol" | "Yakunlangan" | "Arxivlangan";
          scoring_base_points: number;
          scoring_rank_step: number;
          scoring_min_points: number;
          anti_cheat_mode: boolean;
          telegram_message_id: number | null;
          published_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          title: string;
          description?: string | null;
          public_token: string;
          status?: "Qoralama" | "Faol" | "Yakunlangan" | "Arxivlangan";
          scoring_base_points?: number;
          scoring_rank_step?: number;
          scoring_min_points?: number;
          anti_cheat_mode?: boolean;
          telegram_message_id?: number | null;
          published_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          title?: string;
          description?: string | null;
          public_token?: string;
          status?: "Qoralama" | "Faol" | "Yakunlangan" | "Arxivlangan";
          scoring_base_points?: number;
          scoring_rank_step?: number;
          scoring_min_points?: number;
          anti_cheat_mode?: boolean;
          telegram_message_id?: number | null;
          published_at?: string | null;
          closed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      assignment_questions: {
        Row: {
          id: string;
          assignment_id: string;
          position: number;
          question_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          position: number;
          question_text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          position?: number;
          question_text?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      question_options: {
        Row: {
          id: string;
          question_id: string;
          position: number;
          option_text: string;
          is_correct: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          position: number;
          option_text: string;
          is_correct?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          position?: number;
          option_text?: string;
          is_correct?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      assignment_participants: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          display_name_snapshot: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          display_name_snapshot: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          display_name_snapshot?: string;
        };
        Relationships: [];
      };
      assignment_attempts: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          status: "in_progress" | "completed";
          current_question_position: number;
          started_at: string;
          completed_at: string | null;
          raw_score: number;
          final_score: number;
          final_rank: number | null;
          correct_count: number;
          first_place_count: number;
          second_place_count: number;
          suspicious_event_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          status?: "in_progress" | "completed";
          current_question_position?: number;
          started_at?: string;
          completed_at?: string | null;
          raw_score?: number;
          final_score?: number;
          final_rank?: number | null;
          correct_count?: number;
          first_place_count?: number;
          second_place_count?: number;
          suspicious_event_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          status?: "in_progress" | "completed";
          current_question_position?: number;
          started_at?: string;
          completed_at?: string | null;
          raw_score?: number;
          final_score?: number;
          final_rank?: number | null;
          correct_count?: number;
          first_place_count?: number;
          second_place_count?: number;
          suspicious_event_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option_id: string;
          is_correct: boolean;
          correct_rank: number | null;
          score: number;
          confirmed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_option_id: string;
          is_correct: boolean;
          correct_rank?: number | null;
          score?: number;
          confirmed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string;
          selected_option_id?: string;
          is_correct?: boolean;
          correct_rank?: number | null;
          score?: number;
          confirmed_at?: string;
        };
        Relationships: [];
      };
      student_assignment_sessions: {
        Row: {
          id: string;
          attempt_id: string;
          student_id: string;
          assignment_id: string;
          token_hash: string;
          telegram_user_id: number | null;
          telegram_username: string | null;
          created_at: string;
          last_seen_at: string;
          expires_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          student_id: string;
          assignment_id: string;
          token_hash: string;
          telegram_user_id?: number | null;
          telegram_username?: string | null;
          created_at?: string;
          last_seen_at?: string;
          expires_at: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          student_id?: string;
          assignment_id?: string;
          token_hash?: string;
          telegram_user_id?: number | null;
          telegram_username?: string | null;
          last_seen_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      assignment_event_logs: {
        Row: {
          id: string;
          assignment_id: string;
          attempt_id: string | null;
          student_id: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          attempt_id?: string | null;
          student_id?: string | null;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          attempt_id?: string | null;
          student_id?: string | null;
          event_type?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      submit_assignment_answer: {
        Args: {
          p_session_token_hash: string;
          p_selected_option_id: string;
        };
        Returns: Json;
      };
      finalize_assignment_leaderboard: {
        Args: {
          p_assignment_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience Type aliases for application domain
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupStudent = Database["public"]["Tables"]["group_students"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type Homework = Database["public"]["Tables"]["homework"]["Row"];
export type HomeworkSubmission = Database["public"]["Tables"]["homework_submissions"]["Row"];
export type Grade = Database["public"]["Tables"]["grades"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type SystemSettings = Database["public"]["Tables"]["settings"]["Row"];
export type PersonalAuth = Database["public"]["Tables"]["personal_auth"]["Row"];

export type TelegramGroupLink = Database["public"]["Tables"]["telegram_group_links"]["Row"];
export type TelegramGroupConnectCode = Database["public"]["Tables"]["telegram_group_connect_codes"]["Row"];
export type StudentCredential = Database["public"]["Tables"]["student_credentials"]["Row"];
export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type AssignmentQuestion = Database["public"]["Tables"]["assignment_questions"]["Row"];
export type QuestionOption = Database["public"]["Tables"]["question_options"]["Row"];
export type AssignmentParticipant = Database["public"]["Tables"]["assignment_participants"]["Row"];
export type AssignmentAttempt = Database["public"]["Tables"]["assignment_attempts"]["Row"];
export type StudentAnswer = Database["public"]["Tables"]["student_answers"]["Row"];
export type StudentAssignmentSession = Database["public"]["Tables"]["student_assignment_sessions"]["Row"];
export type AssignmentEventLog = Database["public"]["Tables"]["assignment_event_logs"]["Row"];

export type AssignmentStatus = Assignment["status"];

export type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
export type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];
export type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
export type GroupUpdate = Database["public"]["Tables"]["groups"]["Update"];
export type LessonInsert = Database["public"]["Tables"]["lessons"]["Insert"];
export type LessonUpdate = Database["public"]["Tables"]["lessons"]["Update"];
export type AttendanceInsert = Database["public"]["Tables"]["attendance"]["Insert"];
export type AttendanceUpdate = Database["public"]["Tables"]["attendance"]["Update"];
export type HomeworkInsert = Database["public"]["Tables"]["homework"]["Insert"];
export type HomeworkUpdate = Database["public"]["Tables"]["homework"]["Update"];
export type HomeworkSubmissionInsert = Database["public"]["Tables"]["homework_submissions"]["Insert"];
export type HomeworkSubmissionUpdate = Database["public"]["Tables"]["homework_submissions"]["Update"];
export type GradeInsert = Database["public"]["Tables"]["grades"]["Insert"];
export type GradeUpdate = Database["public"]["Tables"]["grades"]["Update"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];
export type SettingsInsert = Database["public"]["Tables"]["settings"]["Insert"];
export type SettingsUpdate = Database["public"]["Tables"]["settings"]["Update"];

