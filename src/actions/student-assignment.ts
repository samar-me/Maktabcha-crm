"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  StudentPublicAssignmentDTO,
  StudentQuestionDTO,
  StudentSafeOptionDTO,
  StudentResultDTO,
  StudentAttemptStatusDTO,
} from "@/types/assignment";
import {
  generateSessionToken,
  hashToken,
  verifyStudentPassword,
} from "@/lib/student-crypto";
import { validateTelegramInitData } from "@/lib/telegram/bot";

const STUDENT_COOKIE_NAME = "maktabcha_student_session";

/**
 * Deterministic pseudo-random shuffle for question options
 * Ensures the options appear in the same randomized order for a specific student attempt
 */
function deterministicShuffle<T>(items: T[], seedStr: string): T[] {
  const arr = [...items];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Helper to get and validate the active student assignment session from cookie
 */
async function getValidatedStudentSession(publicToken: string) {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(STUDENT_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const supabase = createAdminClient();

  const { data: session, error: sessErr } = await supabase
    .from("student_assignment_sessions")
    .select("*, assignments!inner(id, public_token, status, scoring_base_points, scoring_rank_step, scoring_min_points), assignment_attempts!inner(*), students!inner(first_name, last_name)")
    .eq("token_hash", tokenHash)
    .eq("assignments.public_token", publicToken)
    .gt("expires_at", new Date().toISOString())
    .is("revoked_at", null)
    .maybeSingle();

  if (sessErr || !session) {
    return null;
  }

  return session;
}

/**
 * 1. Get Public Assignment Info (Safe for student view before login)
 */
export async function getPublicAssignmentInfoAction(
  publicToken: string
): Promise<{ success: boolean; data?: StudentPublicAssignmentDTO; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data: assignment, error: assErr } = await supabase
      .from("assignments")
      .select("id, title, description, public_token, status, scoring_base_points, scoring_rank_step, groups(name)")
      .eq("public_token", publicToken)
      .maybeSingle();

    if (assErr || !assignment) {
      return { success: false, error: "Topshiriq topilmadi" };
    }

    // Count questions
    const { count: questionCount } = await supabase
      .from("assignment_questions")
      .select("*", { count: "exact", head: true })
      .eq("assignment_id", assignment.id);

    // Get snapshot participants (or active group students if draft)
    const { data: participants } = await supabase
      .from("assignment_participants")
      .select("student_id, display_name_snapshot")
      .eq("assignment_id", assignment.id);

    let participantList: Array<{ studentId: string; displayName: string }> = [];

    if (participants && participants.length > 0) {
      participantList = participants.map((p) => ({
        studentId: p.student_id,
        displayName: p.display_name_snapshot,
      }));
    } else {
      // If assignment is not yet published, fallback to group students
      const { data: groupStudents } = await supabase
        .from("group_students")
        .select("student_id, students(first_name, last_name)")
        .eq("group_id", (assignment as any).group_id)
        .eq("status", "Faol");

      if (groupStudents) {
        participantList = groupStudents.map((gs: any) => ({
          studentId: gs.student_id,
          displayName: `${gs.students?.first_name} ${gs.students?.last_name ? gs.students.last_name[0] + "." : ""}`.trim(),
        }));
      }
    }

    const groupName = (assignment as any).groups?.name || "Guruh";

    return {
      success: true,
      data: {
        publicToken: assignment.public_token,
        title: assignment.title,
        description: assignment.description,
        groupName,
        questionCount: questionCount || 0,
        status: assignment.status,
        scoringBasePoints: assignment.scoring_base_points,
        scoringRankStep: assignment.scoring_rank_step,
        participants: participantList,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Xatolik yuz berdi" };
  }
}

/**
 * 2. Login Student to Assignment
 */
export async function loginStudentToAssignmentAction(params: {
  publicToken: string;
  studentId: string;
  password: string;
  initData: string;
}): Promise<{ success: boolean; isCompleted?: boolean; error?: string }> {
  try {
    const { publicToken, studentId, password, initData } = params;

    if (!studentId || !password) {
      return { success: false, error: "O‘quvchini tanlang va parolni kiriting" };
    }

    const supabase = createAdminClient();

    // 1. Validate Telegram initData (if Telegram config is present)
    const telegramValidation = validateTelegramInitData(initData);
    let tgUserId: number | null = null;
    let tgUsername: string | null = null;

    if (telegramValidation.isValid && telegramValidation.user) {
      tgUserId = telegramValidation.user.id;
      tgUsername = telegramValidation.user.username || null;
    }

    // 2. Fetch Assignment
    const { data: assignment, error: assErr } = await supabase
      .from("assignments")
      .select("id, status, public_token")
      .eq("public_token", publicToken)
      .maybeSingle();

    if (assErr || !assignment) {
      return { success: false, error: "Topshiriq topilmadi" };
    }

    if (assignment.status === "Yakunlangan" || assignment.status === "Arxivlangan") {
      return { success: false, error: "Ushbu topshiriq yakunlangan" };
    }

    // 3. Rate Limit Check (5 failed attempts in last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: failedAttempts } = await supabase
      .from("assignment_event_logs")
      .select("*", { count: "exact", head: true })
      .eq("assignment_id", assignment.id)
      .eq("student_id", studentId)
      .eq("event_type", "login_failed")
      .gt("created_at", tenMinutesAgo);

    if ((failedAttempts || 0) >= 5) {
      return {
        success: false,
        error: "Ko‘p marta noto‘g‘ri parol kiritildi. Iltimos, 10 daqiqadan so‘ng qayta urinib ko‘ring.",
      };
    }

    // 4. Verify Student Password
    const { data: credential, error: credErr } = await supabase
      .from("student_credentials")
      .select("password_hash, password_salt")
      .eq("student_id", studentId)
      .maybeSingle();

    if (credErr || !credential) {
      await supabase.from("assignment_event_logs").insert({
        assignment_id: assignment.id,
        student_id: studentId,
        event_type: "login_failed",
        metadata: { reason: "no_credential" },
      });
      return {
        success: false,
        error: "Siz uchun hali shaxsiy parol belgilanmagan. O‘qituvchingizga murojaat qiling.",
      };
    }

    const isPasswordValid = await verifyStudentPassword(
      password.trim(),
      credential.password_salt,
      credential.password_hash
    );

    if (!isPasswordValid) {
      await supabase.from("assignment_event_logs").insert({
        assignment_id: assignment.id,
        student_id: studentId,
        event_type: "login_failed",
        metadata: { reason: "wrong_password", telegram_user_id: tgUserId },
      });
      return { success: false, error: "Parol noto‘g‘ri kiritildi" };
    }

    // 5. Check or Create ONE ATTEMPT
    let attemptId: string;
    let isCompleted = false;

    const { data: existingAttempt } = await supabase
      .from("assignment_attempts")
      .select("id, status, current_question_position")
      .eq("assignment_id", assignment.id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (existingAttempt) {
      attemptId = existingAttempt.id;
      isCompleted = existingAttempt.status === "completed";
    } else {
      // Create new attempt
      const { data: newAttempt, error: createAttErr } = await supabase
        .from("assignment_attempts")
        .insert({
          assignment_id: assignment.id,
          student_id: studentId,
          status: "in_progress",
          current_question_position: 1,
        })
        .select("id")
        .single();

      if (createAttErr || !newAttempt) {
        console.error("Error creating attempt:", createAttErr);
        return { success: false, error: "Urinish yaratishda xatolik yuz berdi" };
      }
      attemptId = newAttempt.id;
    }

    // 6. One Active Session Enforcement (Revoke previous active sessions)
    const { data: activeSessions } = await supabase
      .from("student_assignment_sessions")
      .select("id")
      .eq("attempt_id", attemptId)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString());

    if (activeSessions && activeSessions.length > 0) {
      await supabase
        .from("student_assignment_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("attempt_id", attemptId);

      await supabase.from("assignment_event_logs").insert({
        assignment_id: assignment.id,
        attempt_id: attemptId,
        student_id: studentId,
        event_type: "session_replaced",
        metadata: { previous_sessions_count: activeSessions.length },
      });
    }

    // 7. Create New Session
    const rawSessionToken = generateSessionToken();
    const sessionHash = hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const { error: insSessErr } = await supabase
      .from("student_assignment_sessions")
      .insert({
        attempt_id: attemptId,
        student_id: studentId,
        assignment_id: assignment.id,
        token_hash: sessionHash,
        telegram_user_id: tgUserId,
        telegram_username: tgUsername,
        expires_at: expiresAt,
      });

    if (insSessErr) {
      console.error("Error inserting student session:", insSessErr);
      return { success: false, error: "Sessiya yaratishda xatolik" };
    }

    // Set HttpOnly Secure Cookie
    const cookieStore = await cookies();
    cookieStore.set(STUDENT_COOKIE_NAME, rawSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return { success: true, isCompleted };
  } catch (err: any) {
    console.error("loginStudentToAssignment error:", err);
    return { success: false, error: err.message || "Kutilmagan xatolik yuz berdi" };
  }
}

/**
 * 3. Get Current Question for the Student (ONLY CURRENT QUESTION - NO PRELOADING)
 */
export async function getCurrentStudentQuestionAction(
  publicToken: string
): Promise<{ success: boolean; data?: StudentQuestionDTO; isCompleted?: boolean; error?: string }> {
  try {
    const session = await getValidatedStudentSession(publicToken);
    if (!session) {
      return { success: false, error: "Sessiya yaroqsiz yoki eskirgan. Iltimos qaytadan kiring." };
    }

    const attempt = session.assignment_attempts as any;
    const assignment = session.assignments as any;

    if (attempt.status === "completed") {
      return { success: true, isCompleted: true };
    }

    const supabase = createAdminClient();

    // Total questions count
    const { count: totalQuestions } = await supabase
      .from("assignment_questions")
      .select("*", { count: "exact", head: true })
      .eq("assignment_id", assignment.id);

    // Fetch ONLY current question matching current_question_position
    const { data: currentQuestion, error: qErr } = await supabase
      .from("assignment_questions")
      .select("id, position, question_text")
      .eq("assignment_id", assignment.id)
      .eq("position", attempt.current_question_position)
      .maybeSingle();

    if (qErr || !currentQuestion) {
      return { success: false, error: "Joriy savol topilmadi" };
    }

    // Fetch options for current question
    const { data: options, error: optErr } = await supabase
      .from("question_options")
      .select("id, position, option_text")
      .eq("question_id", currentQuestion.id);

    if (optErr || !options) {
      return { success: false, error: "Savol variantlari topilmadi" };
    }

    // Deterministic shuffle of options (stable for this attempt and question)
    const seed = `${attempt.id}_${currentQuestion.id}`;
    const shuffledOptions = deterministicShuffle(options, seed);

    const safeOptions: StudentSafeOptionDTO[] = shuffledOptions.map((o) => ({
      id: o.id,
      optionText: o.option_text,
    }));

    return {
      success: true,
      isCompleted: false,
      data: {
        questionId: currentQuestion.id,
        position: currentQuestion.position,
        totalQuestions: totalQuestions || 1,
        questionText: currentQuestion.question_text,
        options: safeOptions,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Xatolik yuz berdi" };
  }
}

/**
 * 4. Submit Answer for the Current Question (Calls Atomic PostgreSQL Function)
 */
export async function submitStudentAnswerAction(
  publicToken: string,
  selectedOptionId: string
): Promise<{ success: boolean; isCompleted?: boolean; nextPosition?: number; error?: string }> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(STUDENT_COOKIE_NAME)?.value;

    if (!rawToken || !selectedOptionId) {
      return { success: false, error: "Sessiya yoki tanlangan variant topilmadi" };
    }

    const tokenHash = hashToken(rawToken);
    const supabase = createAdminClient();

    // Call atomic PostgreSQL function
    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
      "submit_assignment_answer" as any,
      {
        p_session_token_hash: tokenHash,
        p_selected_option_id: selectedOptionId,
      } as any
    );

    if (rpcErr) {
      console.error("RPC submit_assignment_answer error:", rpcErr);
      return { success: false, error: "Javobni qabul qilishda xatolik yuz berdi" };
    }

    const res = rpcResult as any;
    if (!res || !res.success) {
      return { success: false, error: res?.error || "Javobni saqlashda xatolik" };
    }

    return {
      success: true,
      isCompleted: res.is_completed,
      nextPosition: res.next_position,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Xatolik yuz berdi" };
  }
}

/**
 * 5. Get Student Attempt Status
 */
export async function getStudentAttemptStatusAction(
  publicToken: string
): Promise<{ success: boolean; data?: StudentAttemptStatusDTO; error?: string }> {
  try {
    const session = await getValidatedStudentSession(publicToken);
    if (!session) {
      return { success: false, error: "Sessiya topilmadi" };
    }

    const attempt = session.assignment_attempts as any;
    const assignment = session.assignments as any;
    const student = session.students as any;

    const supabase = createAdminClient();
    const { count: totalQuestions } = await supabase
      .from("assignment_questions")
      .select("*", { count: "exact", head: true })
      .eq("assignment_id", assignment.id);

    return {
      success: true,
      data: {
        attemptId: attempt.id,
        studentName: `${student.first_name} ${student.last_name || ""}`.trim(),
        status: attempt.status,
        currentPosition: attempt.current_question_position,
        totalQuestions: totalQuestions || 0,
        startedAt: attempt.started_at,
        completedAt: attempt.completed_at,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Xatolik yuz berdi" };
  }
}

/**
 * 6. Get Student Result (Returns final scores only when finalized)
 */
export async function getStudentResultAction(
  publicToken: string
): Promise<{ success: boolean; data?: StudentResultDTO; error?: string }> {
  try {
    const session = await getValidatedStudentSession(publicToken);
    if (!session) {
      return { success: false, error: "Sessiya topilmadi" };
    }

    const attempt = session.assignment_attempts as any;
    const assignment = session.assignments as any;
    const supabase = createAdminClient();

    const isFinalized = assignment.status === "Yakunlangan";

    if (!isFinalized) {
      return {
        success: true,
        data: {
          isFinalized: false,
        },
      };
    }

    // Total questions
    const { count: totalQuestions } = await supabase
      .from("assignment_questions")
      .select("*", { count: "exact", head: true })
      .eq("assignment_id", assignment.id);

    // Leaderboard
    const { data: allAttempts } = await supabase
      .from("assignment_attempts")
      .select("student_id, raw_score, final_score, final_rank, correct_count")
      .eq("assignment_id", assignment.id)
      .eq("status", "completed")
      .order("final_rank", { ascending: true });

    const { data: participants } = await supabase
      .from("assignment_participants")
      .select("student_id, display_name_snapshot")
      .eq("assignment_id", assignment.id);

    const nameMap = new Map(participants?.map((p) => [p.student_id, p.display_name_snapshot]) || []);

    const leaderboard = (allAttempts || []).map((att) => ({
      rank: att.final_rank || 1,
      displayName: nameMap.get(att.student_id) || "O‘quvchi",
      finalScore: att.final_score,
      correctCount: att.correct_count,
    }));

    // Missing participants
    const completedStudentIds = new Set(allAttempts?.map((a) => a.student_id) || []);
    const missing = (participants || [])
      .filter((p) => !completedStudentIds.has(p.student_id))
      .map((p) => ({
        displayName: p.display_name_snapshot,
        status: "Topshirmadi",
      }));

    return {
      success: true,
      data: {
        isFinalized: true,
        correctCount: attempt.correct_count,
        totalQuestions: totalQuestions || 0,
        rawScore: attempt.raw_score,
        finalScore: attempt.final_score,
        finalRank: attempt.final_rank,
        leaderboard,
        missing,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Xatolik yuz berdi" };
  }
}

/**
 * 7. Log Student Event (Telemetry and anti-cheat tracking)
 */
export async function logStudentEventAction(
  publicToken: string,
  eventType: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean }> {
  try {
    const session = await getValidatedStudentSession(publicToken);
    if (!session) return { success: false };

    const supabase = createAdminClient();
    await supabase.from("assignment_event_logs").insert({
      assignment_id: session.assignment_id,
      attempt_id: session.attempt_id,
      student_id: session.student_id,
      event_type: eventType,
      metadata: metadata || {},
    });

    if (
      eventType === "visibility_hidden" ||
      eventType === "mini_app_deactivated"
    ) {
      await supabase
        .from("assignment_attempts")
        .update({
          suspicious_event_count: (session.assignment_attempts as any).suspicious_event_count + 1,
        })
        .eq("id", session.attempt_id);
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * 8. Logout Student Assignment Session
 */
export async function logoutStudentAssignmentAction() {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(STUDENT_COOKIE_NAME)?.value;

    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      const supabase = createAdminClient();
      await supabase
        .from("student_assignment_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", tokenHash);
    }

    cookieStore.delete(STUDENT_COOKIE_NAME);
    return { success: true };
  } catch {
    return { success: false };
  }
}
