-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('student', 'admin', 'mentor');

-- Create enum for mood levels  
CREATE TYPE public.mood_level AS ENUM ('1', '2', '3', '4', '5');

-- Create enum for recommendation types
CREATE TYPE public.recommendation_type AS ENUM ('breathing', 'mindfulness', 'activity', 'video', 'article');

-- Create students table for anonymous users
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_id TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mood_logs table
CREATE TABLE public.mood_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  mood_level mood_level NOT NULL,
  note TEXT,
  ai_sentiment TEXT,
  ai_stress_level INTEGER CHECK (ai_stress_level >= 1 AND ai_stress_level <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recommendations table
CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mood_log_id UUID REFERENCES public.mood_logs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_url TEXT,
  type recommendation_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for peer support chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  room_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for students table
CREATE POLICY "Students can view their own profile" 
ON public.students 
FOR SELECT 
USING (anonymous_id = current_setting('app.anonymous_id', true));

CREATE POLICY "Students can insert their own profile" 
ON public.students 
FOR INSERT 
WITH CHECK (anonymous_id = current_setting('app.anonymous_id', true));

CREATE POLICY "Admins can view all students" 
ON public.students 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true) 
  AND role = 'admin'
));

-- Create policies for mood_logs table
CREATE POLICY "Students can view their own mood logs" 
ON public.mood_logs 
FOR SELECT 
USING (student_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

CREATE POLICY "Students can insert their own mood logs" 
ON public.mood_logs 
FOR INSERT 
WITH CHECK (student_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

CREATE POLICY "Admins can view all mood logs" 
ON public.mood_logs 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true) 
  AND role = 'admin'
));

-- Create policies for recommendations table
CREATE POLICY "Users can view recommendations for their mood logs" 
ON public.recommendations 
FOR SELECT 
USING (mood_log_id IN (
  SELECT ml.id FROM public.mood_logs ml
  JOIN public.students s ON ml.student_id = s.id
  WHERE s.anonymous_id = current_setting('app.anonymous_id', true)
));

CREATE POLICY "System can insert recommendations" 
ON public.recommendations 
FOR INSERT 
WITH CHECK (true);

-- Create policies for messages table
CREATE POLICY "Users can view messages in their rooms" 
ON public.messages 
FOR SELECT 
USING (
  sender_id IN (
    SELECT id FROM public.students 
    WHERE anonymous_id = current_setting('app.anonymous_id', true)
  ) OR 
  receiver_id IN (
    SELECT id FROM public.students 
    WHERE anonymous_id = current_setting('app.anonymous_id', true)
  ) OR 
  room_id IN (
    SELECT DISTINCT room_id FROM public.messages 
    WHERE sender_id IN (
      SELECT id FROM public.students 
      WHERE anonymous_id = current_setting('app.anonymous_id', true)
    )
  )
);

CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (sender_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample recommendations
INSERT INTO public.recommendations (title, description, content_url, type) VALUES
('Deep Breathing Exercise', '4-7-8 breathing technique to reduce stress', 'https://www.youtube.com/watch?v=YRPh_GaiL8s', 'breathing'),
('5-Minute Mindfulness', 'Quick meditation for busy students', 'https://www.headspace.com/meditation/5-minute-meditation', 'mindfulness'),
('Study Break Activities', 'Physical activities to refresh your mind', '/activities/study-break', 'activity'),
('Managing Test Anxiety', 'Tips and techniques for exam stress', 'https://www.youtube.com/watch?v=test-anxiety', 'video'),
('Sleep Hygiene Guide', 'Better sleep for better mental health', '/articles/sleep-hygiene', 'article');

-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;