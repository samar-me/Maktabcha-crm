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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
