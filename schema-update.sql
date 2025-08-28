-- Quick Schema Update for Video Chat Tables
-- Copy and paste this into Supabase SQL Editor: https://supabase.com/dashboard/project/ghhjczfhjeybfdrynpjf/sql

-- Step 0: Create users table first (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL DEFAULT auth.uid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'mentor')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Create trigger for automatic timestamp updates on users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 0.5: Data Migration - Create user records for any existing references
DO $$
DECLARE
  total_created INTEGER := 0;
  table_created INTEGER;
  has_user_id BOOLEAN;
  has_student_id BOOLEAN;
BEGIN
  RAISE NOTICE 'Starting data migration to create missing user records...';
  
  -- Create users for existing mood_logs records
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='mood_logs') THEN
    
    -- Check which columns exist in mood_logs
    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='mood_logs' AND column_name='user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='mood_logs' AND column_name='student_id'
    ) INTO has_student_id;
    
    RAISE NOTICE 'mood_logs columns - user_id: %, student_id: %', has_user_id, has_student_id;
    
    -- Create users based on available columns
    IF has_user_id AND has_student_id THEN
      -- Both columns exist
      INSERT INTO public.users (id, email, name, role)
      SELECT DISTINCT 
        COALESCE(ml.user_id, ml.student_id) as id,
        'migrated-user-' || COALESCE(ml.user_id, ml.student_id) || '@temp.local' as email,
        'Migrated User' as name,
        'student' as role
      FROM public.mood_logs ml
      LEFT JOIN public.users u ON COALESCE(ml.user_id, ml.student_id) = u.id
      WHERE u.id IS NULL AND COALESCE(ml.user_id, ml.student_id) IS NOT NULL
      ON CONFLICT (id) DO NOTHING;
    ELSIF has_user_id THEN
      -- Only user_id exists
      INSERT INTO public.users (id, email, name, role)
      SELECT DISTINCT 
        ml.user_id as id,
        'migrated-user-' || ml.user_id || '@temp.local' as email,
        'Migrated User' as name,
        'student' as role
      FROM public.mood_logs ml
      LEFT JOIN public.users u ON ml.user_id = u.id
      WHERE u.id IS NULL AND ml.user_id IS NOT NULL
      ON CONFLICT (id) DO NOTHING;
    ELSIF has_student_id THEN
      -- Only student_id exists
      INSERT INTO public.users (id, email, name, role)
      SELECT DISTINCT 
        ml.student_id as id,
        'migrated-user-' || ml.student_id || '@temp.local' as email,
        'Migrated User' as name,
        'student' as role
      FROM public.mood_logs ml
      LEFT JOIN public.users u ON ml.student_id = u.id
      WHERE u.id IS NULL AND ml.student_id IS NOT NULL
      ON CONFLICT (id) DO NOTHING;
    END IF;
    
    GET DIAGNOSTICS table_created = ROW_COUNT;
    total_created := total_created + table_created;
    RAISE NOTICE 'Created % user records from mood_logs', table_created;
  END IF;
  
  -- Create users for existing matchmaking_queue records  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='matchmaking_queue') THEN
    
    -- Check which columns exist in matchmaking_queue
    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='matchmaking_queue' AND column_name='user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='matchmaking_queue' AND column_name='student_id'
    ) INTO has_student_id;
    
    RAISE NOTICE 'matchmaking_queue columns - user_id: %, student_id: %', has_user_id, has_student_id;
    
    -- Create users based on available columns
    IF has_user_id AND has_student_id THEN
      -- Both columns exist
      INSERT INTO public.users (id, email, name, role)
      SELECT DISTINCT 
        COALESCE(mq.user_id, mq.student_id) as id,
        'migrated-user-' || COALESCE(mq.user_id, mq.student_id) || '@temp.local' as email,
        'Migrated User' as name,
        'student' as role
      FROM public.matchmaking_queue mq
      LEFT JOIN public.users u ON COALESCE(mq.user_id, mq.student_id) = u.id
      WHERE u.id IS NULL AND COALESCE(mq.user_id, mq.student_id) IS NOT NULL
      ON CONFLICT (id) DO NOTHING;
    ELSIF has_user_id THEN
      -- Only user_id exists
      INSERT INTO public.users (id, email, name, role)
      SELECT DISTINCT 
        mq.user_id as id,
        'migrated-user-' || mq.user_id || '@temp.local' as email,
        'Migrated User' as name,
        'student' as role
      FROM public.matchmaking_queue mq
      LEFT JOIN public.users u ON mq.user_id = u.id
      WHERE u.id IS NULL AND mq.user_id IS NOT NULL
      ON CONFLICT (id) DO NOTHING;
    ELSIF has_student_id THEN
      -- Only student_id exists
      INSERT INTO public.users (id, email, name, role)
      SELECT DISTINCT 
        mq.student_id as id,
        'migrated-user-' || mq.student_id || '@temp.local' as email,
        'Migrated User' as name,
        'student' as role
      FROM public.matchmaking_queue mq
      LEFT JOIN public.users u ON mq.student_id = u.id
      WHERE u.id IS NULL AND mq.student_id IS NOT NULL
      ON CONFLICT (id) DO NOTHING;
    END IF;
    
    GET DIAGNOSTICS table_created = ROW_COUNT;
    total_created := total_created + table_created;
    RAISE NOTICE 'Created % user records from matchmaking_queue', table_created;
  END IF;
  
  RAISE NOTICE 'Data migration completed. Total user records created: %', total_created;
END $$;

-- Step 1: Update matchmaking_queue table
DO $$
BEGIN
  -- Check and rename student_id to user_id in matchmaking_queue
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='matchmaking_queue' AND column_name='student_id') THEN
    
    -- Drop foreign key constraint if it exists
    ALTER TABLE public.matchmaking_queue 
      DROP CONSTRAINT IF EXISTS matchmaking_queue_student_id_fkey;
    
    -- Rename the column
    ALTER TABLE public.matchmaking_queue 
      RENAME COLUMN student_id TO user_id;
    
    -- Add foreign key constraint to users table (only if users table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users') THEN
      ALTER TABLE public.matchmaking_queue 
        ADD CONSTRAINT matchmaking_queue_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint for matchmaking_queue.user_id -> users.id';
    ELSE
      RAISE NOTICE 'Users table not found, skipping foreign key constraint for matchmaking_queue';
    END IF;
    
    RAISE NOTICE 'Updated matchmaking_queue table: student_id -> user_id';
  ELSE
    RAISE NOTICE 'matchmaking_queue table already uses user_id';
  END IF;
END $$;

-- Step 2: Update video_chat_sessions table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='video_chat_sessions') THEN
    -- Update student1_id and student2_id columns
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='video_chat_sessions' AND column_name='student1_id') THEN
      
      -- Drop constraints
      ALTER TABLE public.video_chat_sessions 
        DROP CONSTRAINT IF EXISTS video_chat_sessions_student1_id_fkey;
      ALTER TABLE public.video_chat_sessions 
        DROP CONSTRAINT IF EXISTS video_chat_sessions_student2_id_fkey;
      
      -- Rename columns
      ALTER TABLE public.video_chat_sessions 
        RENAME COLUMN student1_id TO user1_id;
      ALTER TABLE public.video_chat_sessions 
        RENAME COLUMN student2_id TO user2_id;
      
      -- Add new constraints (only if users table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users') THEN
        ALTER TABLE public.video_chat_sessions 
          ADD CONSTRAINT video_chat_sessions_user1_id_fkey 
          FOREIGN KEY (user1_id) REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.video_chat_sessions 
          ADD CONSTRAINT video_chat_sessions_user2_id_fkey 
          FOREIGN KEY (user2_id) REFERENCES public.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraints for video_chat_sessions';
      ELSE
        RAISE NOTICE 'Users table not found, skipping foreign key constraints for video_chat_sessions';
      END IF;
      
      RAISE NOTICE 'Updated video_chat_sessions table: student columns -> user columns';
    END IF;
  END IF;
END $$;

-- Step 3: Update signaling_messages table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='signaling_messages') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='signaling_messages' AND column_name='from_student_id') THEN
      
      -- Drop constraints
      ALTER TABLE public.signaling_messages 
        DROP CONSTRAINT IF EXISTS signaling_messages_from_student_id_fkey;
      ALTER TABLE public.signaling_messages 
        DROP CONSTRAINT IF EXISTS signaling_messages_to_student_id_fkey;
      
      -- Rename columns
      ALTER TABLE public.signaling_messages 
        RENAME COLUMN from_student_id TO from_user_id;
      ALTER TABLE public.signaling_messages 
        RENAME COLUMN to_student_id TO to_user_id;
      
      -- Add new constraints (only if users table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users') THEN
        ALTER TABLE public.signaling_messages 
          ADD CONSTRAINT signaling_messages_from_user_id_fkey 
          FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.signaling_messages 
          ADD CONSTRAINT signaling_messages_to_user_id_fkey 
          FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraints for signaling_messages';
      ELSE
        RAISE NOTICE 'Users table not found, skipping foreign key constraints for signaling_messages';
      END IF;
      
      RAISE NOTICE 'Updated signaling_messages table: student columns -> user columns';
    END IF;
  END IF;
END $$;

-- Step 4: Update session_reports table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='session_reports') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='session_reports' AND column_name='reported_student_id') THEN
      
      -- Drop constraints
      ALTER TABLE public.session_reports 
        DROP CONSTRAINT IF EXISTS session_reports_reported_student_id_fkey;
      ALTER TABLE public.session_reports 
        DROP CONSTRAINT IF EXISTS session_reports_reporter_student_id_fkey;
      
      -- Rename columns
      ALTER TABLE public.session_reports 
        RENAME COLUMN reported_student_id TO reported_user_id;
      ALTER TABLE public.session_reports 
        RENAME COLUMN reporter_student_id TO reporter_user_id;
      
      -- Add new constraints (only if users table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users') THEN
        ALTER TABLE public.session_reports 
          ADD CONSTRAINT session_reports_reported_user_id_fkey 
          FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        ALTER TABLE public.session_reports 
          ADD CONSTRAINT session_reports_reporter_user_id_fkey 
          FOREIGN KEY (reporter_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraints for session_reports';
      ELSE
        RAISE NOTICE 'Users table not found, skipping foreign key constraints for session_reports';
      END IF;
      
      RAISE NOTICE 'Updated session_reports table: student columns -> user columns';
    END IF;
  END IF;
END $$;

-- Step 5: Update mood_logs table structure (if it still uses student_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='mood_logs' AND column_name='student_id') THEN
    
    -- Drop constraint
    ALTER TABLE public.mood_logs 
      DROP CONSTRAINT IF EXISTS mood_logs_student_id_fkey;
    
    -- Rename column
    ALTER TABLE public.mood_logs 
      RENAME COLUMN student_id TO user_id;
    
    RAISE NOTICE 'Renamed mood_logs.student_id to user_id';
  END IF;
  
  -- Add foreign key constraint (data migration was done earlier)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mood_logs' AND column_name='user_id') THEN
    
    -- Drop existing constraint if any
    ALTER TABLE public.mood_logs 
      DROP CONSTRAINT IF EXISTS mood_logs_user_id_fkey;
    
    -- Add the constraint
    ALTER TABLE public.mood_logs 
      ADD CONSTRAINT mood_logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for mood_logs.user_id -> users.id';
  ELSE
    RAISE NOTICE 'Skipping foreign key constraint for mood_logs (missing table or column)';
  END IF;
END $$;

SELECT 'Schema update completed! All tables now use user_id instead of student_id.' as result;