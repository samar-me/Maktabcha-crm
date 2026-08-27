-- Migration: Telegram Assignments, Bot Integration, and Student Mini App Platform
-- Created: 2025-01-01 00:00:03

-- 1. TELEGRAM GROUP LINKS
CREATE TABLE IF NOT EXISTS public.telegram_group_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  telegram_chat_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Faol' CHECK (status IN ('Faol', 'Uzilgan')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_group_link UNIQUE (group_id),
  CONSTRAINT unique_telegram_chat UNIQUE (telegram_chat_id)
);

-- 2. TELEGRAM GROUP CONNECT CODES (Short-lived 6-char connection codes)
CREATE TABLE IF NOT EXISTS public.telegram_group_connect_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  plain_code TEXT NOT NULL, -- Stored temporarily for quick matching in webhook, or verified via hash
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. STUDENT CREDENTIALS (Sensitive passwords for Telegram Mini App)
CREATE TABLE IF NOT EXISTS public.student_credentials (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  public_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Qoralama' CHECK (status IN ('Qoralama', 'Faol', 'Yakunlangan', 'Arxivlangan')),
  scoring_base_points INTEGER NOT NULL DEFAULT 1000,
  scoring_rank_step INTEGER NOT NULL DEFAULT 100,
  scoring_min_points INTEGER NOT NULL DEFAULT 100,
  anti_cheat_mode BOOLEAN NOT NULL DEFAULT true,
  telegram_message_id BIGINT,
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ASSIGNMENT QUESTIONS
CREATE TABLE IF NOT EXISTS public.assignment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_assignment_question_position UNIQUE (assignment_id, position)
);

-- 6. QUESTION OPTIONS
CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.assignment_questions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. ASSIGNMENT PARTICIPANTS (Snapshot of active students at publish time)
CREATE TABLE IF NOT EXISTS public.assignment_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  display_name_snapshot TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_assignment_participant UNIQUE (assignment_id, student_id)
);

-- 8. ASSIGNMENT ATTEMPTS (Single attempt per student constraint)
CREATE TABLE IF NOT EXISTS public.assignment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  current_question_position INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  raw_score INTEGER NOT NULL DEFAULT 0,
  final_score INTEGER NOT NULL DEFAULT 0,
  final_rank INTEGER,
  correct_count INTEGER NOT NULL DEFAULT 0,
  first_place_count INTEGER NOT NULL DEFAULT 0,
  second_place_count INTEGER NOT NULL DEFAULT 0,
  suspicious_event_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_assignment_attempt UNIQUE (assignment_id, student_id)
);

-- 9. STUDENT ANSWERS (Immutable once confirmed)
CREATE TABLE IF NOT EXISTS public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.assignment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.assignment_questions(id) ON DELETE CASCADE,
  selected_option_id UUID NOT NULL REFERENCES public.question_options(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  correct_rank INTEGER,
  score INTEGER NOT NULL DEFAULT 0,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_attempt_question_answer UNIQUE (attempt_id, question_id)
);

-- 10. STUDENT ASSIGNMENT SESSIONS (Single active session per attempt)
CREATE TABLE IF NOT EXISTS public.student_assignment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.assignment_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  telegram_user_id BIGINT,
  telegram_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- 11. ASSIGNMENT EVENT LOGS (Anti-cheat and visibility telemetry)
CREATE TABLE IF NOT EXISTS public.assignment_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES public.assignment_attempts(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_assignments_group ON public.assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_token ON public.assignments(public_token);
CREATE INDEX IF NOT EXISTS idx_assignment_questions_assign_pos ON public.assignment_questions(assignment_id, position);
CREATE INDEX IF NOT EXISTS idx_question_options_question ON public.question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_assignment_participants_assign ON public.assignment_participants(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_assign_student ON public.assignment_attempts(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question_correct ON public.student_answers(question_id, is_correct);
CREATE INDEX IF NOT EXISTS idx_student_assignment_sessions_token ON public.student_assignment_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_assignment_event_logs_assign ON public.assignment_event_logs(assignment_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.telegram_group_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_group_connect_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assignment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_event_logs ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (Authenticated Admin CRM access only; ZERO anon access)
CREATE POLICY "Authenticated users can access telegram_group_links" ON public.telegram_group_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access telegram_group_connect_codes" ON public.telegram_group_connect_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access student_credentials" ON public.student_credentials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access assignments" ON public.assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access assignment_questions" ON public.assignment_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access question_options" ON public.question_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access assignment_participants" ON public.assignment_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access assignment_attempts" ON public.assignment_attempts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access student_answers" ON public.student_answers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access student_assignment_sessions" ON public.student_assignment_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can access assignment_event_logs" ON public.assignment_event_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- UPDATED_AT TRIGGERS
CREATE OR REPLACE TRIGGER trigger_telegram_group_links_updated_at BEFORE UPDATE ON public.telegram_group_links FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trigger_student_credentials_updated_at BEFORE UPDATE ON public.student_credentials FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trigger_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trigger_assignment_questions_updated_at BEFORE UPDATE ON public.assignment_questions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trigger_question_options_updated_at BEFORE UPDATE ON public.question_options FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trigger_assignment_attempts_updated_at BEFORE UPDATE ON public.assignment_attempts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ATOMIC POSTGRESQL FUNCTIONS
-- ============================================================================

-- Function: submit_assignment_answer (Atomic Concurrency Safe)
CREATE OR REPLACE FUNCTION public.submit_assignment_answer(
  p_session_token_hash TEXT,
  p_selected_option_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session RECORD;
  v_attempt RECORD;
  v_assignment RECORD;
  v_question RECORD;
  v_option RECORD;
  v_existing_answer RECORD;
  v_is_correct BOOLEAN;
  v_correct_rank INTEGER := NULL;
  v_score INTEGER := 0;
  v_total_questions INTEGER;
  v_is_completed BOOLEAN := false;
  v_next_pos INTEGER;
  v_all_completed BOOLEAN;
BEGIN
  -- 1. Verify Active Session
  SELECT * INTO v_session
  FROM public.student_assignment_sessions
  WHERE token_hash = p_session_token_hash
    AND expires_at > now()
    AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sessiya yaroqsiz yoki eskirgan');
  END IF;

  -- 2. Lock and retrieve attempt
  SELECT * INTO v_attempt
  FROM public.assignment_attempts
  WHERE id = v_session.attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Urinish topilmadi');
  END IF;

  IF v_attempt.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Topshiriq allaqachon yakunlangan');
  END IF;

  -- 3. Verify Assignment Status
  SELECT * INTO v_assignment
  FROM public.assignments
  WHERE id = v_attempt.assignment_id;

  IF NOT FOUND OR v_assignment.status <> 'Faol' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Topshiriq ayni vaqtda faol emas');
  END IF;

  -- 4. Get Current Question for Attempt
  SELECT * INTO v_question
  FROM public.assignment_questions
  WHERE assignment_id = v_assignment.id
    AND position = v_attempt.current_question_position
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Joriy savol topilmadi');
  END IF;

  -- 5. Verify Selected Option belongs to this Question
  SELECT * INTO v_option
  FROM public.question_options
  WHERE id = p_selected_option_id
    AND question_id = v_question.id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tanlangan javob varianti ushbu savolga tegishli emas');
  END IF;

  -- 6. Check if answer already exists (Idempotent replay check)
  SELECT * INTO v_existing_answer
  FROM public.student_answers
  WHERE attempt_id = v_attempt.id
    AND question_id = v_question.id;

  IF FOUND THEN
    -- If already answered, return current state without re-scoring
    SELECT count(*) INTO v_total_questions
    FROM public.assignment_questions
    WHERE assignment_id = v_assignment.id;

    RETURN jsonb_build_object(
      'success', true,
      'already_answered', true,
      'is_completed', v_attempt.status = 'completed',
      'current_position', v_attempt.current_question_position,
      'total_questions', v_total_questions
    );
  END IF;

  -- 7. Atomic Correctness & Scoring Logic
  v_is_correct := v_option.is_correct;

  IF v_is_correct THEN
    -- Atomic rank calculation among correct answers for this question
    SELECT count(*) + 1 INTO v_correct_rank
    FROM public.student_answers
    WHERE question_id = v_question.id
      AND is_correct = true;

    -- Formula: max(min_points, base_points - ((rank - 1) * step))
    v_score := GREATEST(
      v_assignment.scoring_min_points,
      v_assignment.scoring_base_points - ((v_correct_rank - 1) * v_assignment.scoring_rank_step)
    );
  ELSE
    v_correct_rank := NULL;
    v_score := 0;
  END IF;

  -- 8. Insert Immutable Answer Record
  INSERT INTO public.student_answers (
    attempt_id,
    question_id,
    selected_option_id,
    is_correct,
    correct_rank,
    score,
    confirmed_at
  ) VALUES (
    v_attempt.id,
    v_question.id,
    v_option.id,
    v_is_correct,
    v_correct_rank,
    v_score,
    now()
  );

  -- 9. Check Total Questions and Advance Attempt
  SELECT count(*) INTO v_total_questions
  FROM public.assignment_questions
  WHERE assignment_id = v_assignment.id;

  IF v_attempt.current_question_position >= v_total_questions THEN
    v_is_completed := true;
    v_next_pos := v_attempt.current_question_position;

    UPDATE public.assignment_attempts
    SET status = 'completed',
        completed_at = now(),
        raw_score = raw_score + v_score,
        correct_count = correct_count + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
        first_place_count = first_place_count + (CASE WHEN v_correct_rank = 1 THEN 1 ELSE 0 END),
        second_place_count = second_place_count + (CASE WHEN v_correct_rank = 2 THEN 1 ELSE 0 END),
        updated_at = now()
    WHERE id = v_attempt.id;

    -- Check if all participants finished to auto-finalize
    SELECT NOT EXISTS (
      SELECT 1 FROM public.assignment_participants ap
      LEFT JOIN public.assignment_attempts aa
        ON aa.assignment_id = ap.assignment_id AND aa.student_id = ap.student_id
      WHERE ap.assignment_id = v_assignment.id
        AND (aa.status IS NULL OR aa.status <> 'completed')
    ) INTO v_all_completed;

    IF v_all_completed THEN
      PERFORM public.finalize_assignment_leaderboard(v_assignment.id);
    END IF;

  ELSE
    v_is_completed := false;
    v_next_pos := v_attempt.current_question_position + 1;

    UPDATE public.assignment_attempts
    SET current_question_position = v_next_pos,
        raw_score = raw_score + v_score,
        correct_count = correct_count + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
        first_place_count = first_place_count + (CASE WHEN v_correct_rank = 1 THEN 1 ELSE 0 END),
        second_place_count = second_place_count + (CASE WHEN v_correct_rank = 2 THEN 1 ELSE 0 END),
        updated_at = now()
    WHERE id = v_attempt.id;
  END IF;

  -- Update session last seen
  UPDATE public.student_assignment_sessions
  SET last_seen_at = now()
  WHERE id = v_session.id;

  -- Safe response WITHOUT revealing is_correct or score during test
  RETURN jsonb_build_object(
    'success', true,
    'is_completed', v_is_completed,
    'next_position', v_next_pos,
    'total_questions', v_total_questions
  );
END;
$$;

-- Function: finalize_assignment_leaderboard (Deterministic Tie-Breaking & Unique Final Scores)
CREATE OR REPLACE FUNCTION public.finalize_assignment_leaderboard(
  p_assignment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_participant_count INTEGER;
  v_rank INTEGER := 1;
  v_unique_bonus INTEGER;
  v_final_score INTEGER;
  v_row RECORD;
  v_results JSONB := '[]'::jsonb;
  v_missing JSONB := '[]'::jsonb;
BEGIN
  -- Total participant snapshot count
  SELECT count(*) INTO v_participant_count
  FROM public.assignment_participants
  WHERE assignment_id = p_assignment_id;

  IF v_participant_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ushbu topshiriqda qatnashuvchilar topilmadi');
  END IF;

  -- Deterministic ranking of completed attempts
  FOR v_row IN
    SELECT
      aa.id AS attempt_id,
      aa.student_id,
      ap.display_name_snapshot,
      aa.raw_score,
      aa.correct_count,
      aa.first_place_count,
      aa.second_place_count,
      aa.completed_at
    FROM public.assignment_attempts aa
    JOIN public.assignment_participants ap
      ON ap.assignment_id = aa.assignment_id AND ap.student_id = aa.student_id
    WHERE aa.assignment_id = p_assignment_id
      AND aa.status = 'completed'
    ORDER BY
      aa.raw_score DESC,
      aa.correct_count DESC,
      aa.first_place_count DESC,
      aa.second_place_count DESC,
      aa.completed_at ASC,
      aa.student_id ASC
  LOOP
    -- Unique bonus formula: participant_count - final_rank + 1
    v_unique_bonus := v_participant_count - v_rank + 1;
    v_final_score := v_row.raw_score + v_unique_bonus;

    UPDATE public.assignment_attempts
    SET final_rank = v_rank,
        final_score = v_final_score,
        updated_at = now()
    WHERE id = v_row.attempt_id;

    v_results := v_results || jsonb_build_object(
      'rank', v_rank,
      'student_id', v_row.student_id,
      'display_name', v_row.display_name_snapshot,
      'raw_score', v_row.raw_score,
      'final_score', v_final_score,
      'correct_count', v_row.correct_count,
      'completed_at', v_row.completed_at
    );

    v_rank := v_rank + 1;
  END LOOP;

  -- Missing / unsubmitted participants
  FOR v_row IN
    SELECT
      ap.student_id,
      ap.display_name_snapshot
    FROM public.assignment_participants ap
    LEFT JOIN public.assignment_attempts aa
      ON aa.assignment_id = ap.assignment_id AND aa.student_id = ap.student_id
    WHERE ap.assignment_id = p_assignment_id
      AND (aa.status IS NULL OR aa.status <> 'completed')
    ORDER BY ap.display_name_snapshot ASC
  LOOP
    v_missing := v_missing || jsonb_build_object(
      'student_id', v_row.student_id,
      'display_name', v_row.display_name_snapshot,
      'status', 'Topshirmadi'
    );
  END LOOP;

  -- Mark assignment as finalized
  UPDATE public.assignments
  SET status = 'Yakunlangan',
      closed_at = COALESCE(closed_at, now()),
      updated_at = now()
  WHERE id = p_assignment_id;

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', p_assignment_id,
    'participant_count', v_participant_count,
    'completed_count', jsonb_array_length(v_results),
    'leaderboard', v_results,
    'missing', v_missing
  );
END;
$$;
