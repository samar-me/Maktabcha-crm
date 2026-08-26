import { Assignment, AssignmentQuestion, QuestionOption, AssignmentParticipant, AssignmentAttempt, TelegramGroupLink } from "./database";

export type { Assignment, AssignmentQuestion, QuestionOption, AssignmentParticipant, AssignmentAttempt, TelegramGroupLink };

// ============================================================================
// CLIENT-SAFE STUDENT DTOs (Zero leakage of is_correct or sensitive CRM data)
// ============================================================================

export interface StudentPublicAssignmentDTO {
  publicToken: string;
  title: string;
  description: string | null;
  groupName: string;
  questionCount: number;
  status: string;
  scoringBasePoints: number;
  scoringRankStep: number;
  participants: Array<{
    studentId: string;
    displayName: string;
  }>;
}

export interface StudentSafeOptionDTO {
  id: string;
  optionText: string;
}

export interface StudentQuestionDTO {
  questionId: string;
  position: number;
  totalQuestions: number;
  questionText: string;
  options: StudentSafeOptionDTO[];
}

export interface StudentAttemptStatusDTO {
  attemptId: string;
  studentName: string;
  status: "in_progress" | "completed";
  currentPosition: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
}

export interface StudentLeaderboardItemDTO {
  rank: number;
  displayName: string;
  finalScore: number;
  correctCount: number;
}

export interface StudentResultDTO {
  isFinalized: boolean;
  correctCount?: number;
  totalQuestions?: number;
  rawScore?: number;
  finalScore?: number;
  finalRank?: number;
  leaderboard?: StudentLeaderboardItemDTO[];
  missing?: Array<{
    displayName: string;
    status: string;
  }>;
}

// ============================================================================
// ADMIN ASSIGNMENT MANAGEMENT INTERFACES
// ============================================================================

export interface QuestionOptionDraft {
  id?: string;
  optionText: string;
  isCorrect: boolean;
}

export interface QuestionDraft {
  id?: string;
  position: number;
  questionText: string;
  options: QuestionOptionDraft[];
}

export interface AssignmentDetailWithQuestions extends Assignment {
  groupName?: string;
  questions: Array<
    AssignmentQuestion & {
      options: QuestionOption[];
    }
  >;
  participants: AssignmentParticipant[];
  telegramLink?: TelegramGroupLink | null;
  stats?: {
    totalParticipants: number;
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    averageScore: number;
  };
}

export interface AdminParticipantProgress {
  studentId: string;
  displayName: string;
  status: "not_started" | "in_progress" | "completed";
  currentPosition: number;
  rawScore: number;
  finalScore: number;
  finalRank: number | null;
  correctCount: number;
  firstPlaceCount: number;
  secondPlaceCount: number;
  suspiciousEventCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TelegramInitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}
