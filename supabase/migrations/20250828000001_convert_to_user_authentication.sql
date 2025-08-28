-- Convert from anonymous student-based system to user-based authentication
-- This migration preserves video chat functionality while updating the schema

-- Step 1: Create users table for normal authentication
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL DEFAULT auth.uid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Update mood_logs table to reference users instead of students
DO $$
BEGIN
  -- Check if student_id column exists before renaming
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='mood_logs' AND column_name='student_id') THEN
    -- Drop existing foreign key constraint
    ALTER TABLE public.mood_logs 
      DROP CONSTRAINT IF EXISTS mood_logs_student_id_fkey;
    
    -- Rename column
    ALTER TABLE public.mood_logs 
      RENAME COLUMN student_id TO user_id;
    
    -- Add new foreign key constraint
    ALTER TABLE public.mood_logs 
      ADD CONSTRAINT mood_logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Update video chat tables to use user_id instead of student_id

-- Update matchmaking_queue table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name='matchmaking_queue') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='matchmaking_queue' AND column_name='student_id') THEN
      ALTER TABLE public.matchmaking_queue 
        DROP CONSTRAINT IF EXISTS matchmaking_queue_student_id_fkey;
      
      ALTER TABLE public.matchmaking_queue 
        RENAME COLUMN student_id TO user_id;
      
      ALTER TABLE public.matchmaking_queue 
        ADD CONSTRAINT matchmaking_queue_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Update video_chat_sessions table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name='video_chat_sessions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='video_chat_sessions' AND column_name='student1_id') THEN
      ALTER TABLE public.video_chat_sessions 
        DROP CONSTRAINT IF EXISTS video_chat_sessions_student1_id_fkey;
      ALTER TABLE public.video_chat_sessions 
        DROP CONSTRAINT IF EXISTS video_chat_sessions_student2_id_fkey;
      
      ALTER TABLE public.video_chat_sessions 
        RENAME COLUMN student1_id TO user1_id;
      ALTER TABLE public.video_chat_sessions 
        RENAME COLUMN student2_id TO user2_id;
      
      ALTER TABLE public.video_chat_sessions 
        ADD CONSTRAINT video_chat_sessions_user1_id_fkey 
        FOREIGN KEY (user1_id) REFERENCES public.users(id) ON DELETE CASCADE;
      ALTER TABLE public.video_chat_sessions 
        ADD CONSTRAINT video_chat_sessions_user2_id_fkey 
        FOREIGN KEY (user2_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Update signaling_messages table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name='signaling_messages') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='signaling_messages' AND column_name='from_student_id') THEN
      ALTER TABLE public.signaling_messages 
        DROP CONSTRAINT IF EXISTS signaling_messages_from_student_id_fkey;
      ALTER TABLE public.signaling_messages 
        DROP CONSTRAINT IF EXISTS signaling_messages_to_student_id_fkey;
      
      ALTER TABLE public.signaling_messages 
        RENAME COLUMN from_student_id TO from_user_id;
      ALTER TABLE public.signaling_messages 
        RENAME COLUMN to_student_id TO to_user_id;
      
      ALTER TABLE public.signaling_messages 
        ADD CONSTRAINT signaling_messages_from_user_id_fkey 
        FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
      ALTER TABLE public.signaling_messages 
        ADD CONSTRAINT signaling_messages_to_user_id_fkey 
        FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Update session_reports table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name='session_reports') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='session_reports' AND column_name='reported_student_id') THEN
      ALTER TABLE public.session_reports 
        DROP CONSTRAINT IF EXISTS session_reports_reported_student_id_fkey;
      ALTER TABLE public.session_reports 
        DROP CONSTRAINT IF EXISTS session_reports_reporter_student_id_fkey;
      
      ALTER TABLE public.session_reports 
        RENAME COLUMN reported_student_id TO reported_user_id;
      ALTER TABLE public.session_reports 
        RENAME COLUMN reporter_student_id TO reporter_user_id;
      
      ALTER TABLE public.session_reports 
        ADD CONSTRAINT session_reports_reported_user_id_fkey 
        FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
      ALTER TABLE public.session_reports 
        ADD CONSTRAINT session_reports_reporter_user_id_fkey 
        FOREIGN KEY (reporter_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Step 4: Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies for users table (only users can access their own data)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- Step 6: Update mood_logs policies to use auth.uid()
DROP POLICY IF EXISTS "Students can view their own mood logs" ON public.mood_logs;
DROP POLICY IF EXISTS "Students can insert their own mood logs" ON public.mood_logs;
DROP POLICY IF EXISTS "Admins can view all mood logs" ON public.mood_logs;
DROP POLICY IF EXISTS "Users can view their own mood logs" ON public.mood_logs;
DROP POLICY IF EXISTS "Users can insert their own mood logs" ON public.mood_logs;

CREATE POLICY "Users can view their own mood logs" 
ON public.mood_logs 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own mood logs" 
ON public.mood_logs 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all mood logs" 
ON public.mood_logs 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE id = auth.uid() 
  AND role = 'admin'
));

-- Step 7: Update recommendations policies
DROP POLICY IF EXISTS "Users can view recommendations for their mood logs" ON public.recommendations;

CREATE POLICY "Users can view recommendations for their mood logs" 
ON public.recommendations 
FOR SELECT 
USING (mood_log_id IN (
  SELECT ml.id FROM public.mood_logs ml
  WHERE ml.user_id = auth.uid()
));

-- Step 8: Create trigger for automatic timestamp updates on users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 9: Drop the old students table after ensuring data is migrated
-- Note: This is commented out to prevent data loss. Uncomment after verifying migration
-- DROP TABLE IF EXISTS public.students CASCADE;