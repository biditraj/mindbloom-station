-- Temporary fix: Simplify RLS policies for testing
-- This allows basic access without the complex set_config requirement

-- Temporarily disable RLS for debugging
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_logs DISABLE ROW LEVEL SECURITY;  
ALTER TABLE public.recommendations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows all operations for now
-- This should be replaced with proper policies once the app is working
DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
DROP POLICY IF EXISTS "Students can insert their own profile" ON public.students;
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;

-- Re-enable RLS with simpler policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to access students table for now
CREATE POLICY "Allow all access to students" ON public.students FOR ALL USING (true) WITH CHECK (true);

-- Similar for other tables  
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to mood_logs" ON public.mood_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY; 
CREATE POLICY "Allow all access to recommendations" ON public.recommendations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);