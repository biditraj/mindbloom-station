-- Remove anonymous-related tables and update schema for normal user authentication

-- Drop video chat related tables
DROP TABLE IF EXISTS public.connection_logs;
DROP TABLE IF EXISTS public.session_reports;
DROP TABLE IF EXISTS public.signaling_messages;
DROP TABLE IF EXISTS public.video_chat_sessions;
DROP TABLE IF EXISTS public.matchmaking_queue;

-- Drop anonymous messaging table
DROP TABLE IF EXISTS public.messages;

-- Drop old students table (anonymous-based)
DROP TABLE IF EXISTS public.students CASCADE;

-- Create users table for normal authentication
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update mood_logs table to reference users instead of students
ALTER TABLE public.mood_logs 
  DROP CONSTRAINT IF EXISTS mood_logs_student_id_fkey;

ALTER TABLE public.mood_logs 
  RENAME COLUMN student_id TO user_id;

ALTER TABLE public.mood_logs 
  ADD CONSTRAINT mood_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table (only users can access their own data)
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

-- Update mood_logs policies to use auth.uid()
DROP POLICY IF EXISTS "Students can view their own mood logs" ON public.mood_logs;
DROP POLICY IF EXISTS "Students can insert their own mood logs" ON public.mood_logs;
DROP POLICY IF EXISTS "Admins can view all mood logs" ON public.mood_logs;

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

-- Update recommendations policies
DROP POLICY IF EXISTS "Users can view recommendations for their mood logs" ON public.recommendations;

CREATE POLICY "Users can view recommendations for their mood logs" 
ON public.recommendations 
FOR SELECT 
USING (mood_log_id IN (
  SELECT ml.id FROM public.mood_logs ml
  WHERE ml.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates on users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove old anonymous-related functions
DROP FUNCTION IF EXISTS public.set_config(text, text);
DROP FUNCTION IF EXISTS public.cleanup_old_queue_entries();
DROP FUNCTION IF EXISTS public.find_match_for_user(UUID);

-- Drop old enum types that are no longer needed
DROP TYPE IF EXISTS public.session_status;
DROP TYPE IF EXISTS public.connection_status;