// Simple migration script to manually execute SQL
// Run with: node simple-migrate.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createUsersTable() {
  console.log('🚀 Creating users table...');

  const { data, error } = await supabase
    .from('users')
    .select('count', { count: 'exact', head: true });

  if (error && error.code === 'PGRST106') {
    // Table doesn't exist, create it
    console.log('📄 Creating users table...');
    
    // We'll create the table manually using a raw SQL approach
    // For now, let's provide instructions for manual creation
    console.log('🔧 Please run the following SQL in your Supabase SQL Editor:');
    console.log(`
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL DEFAULT auth.uid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'mentor')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Update matchmaking_queue table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='matchmaking_queue') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matchmaking_queue' AND column_name='student_id') THEN
      ALTER TABLE public.matchmaking_queue DROP CONSTRAINT IF EXISTS matchmaking_queue_student_id_fkey;
      ALTER TABLE public.matchmaking_queue RENAME COLUMN student_id TO user_id;
      -- Note: We can't add foreign key to users table until it exists
    END IF;
  END IF;
END $$;
    `);
    
    console.log('\n📋 After running the SQL above:');
    console.log('1. Go to https://supabase.com/dashboard/project/ghhjczfhjeybfdrynpjf/sql');
    console.log('2. Paste and run the SQL above');
    console.log('3. Then run this script again to verify');
    
    return false;
  } else if (error) {
    console.error('❌ Error checking users table:', error);
    return false;
  } else {
    console.log('✅ Users table already exists!');
    return true;
  }
}

async function checkVideoTablesSchema() {
  console.log('🔍 Checking video chat table schema...');
  
  try {
    // Check matchmaking_queue table
    const { error: queueError } = await supabase
      .from('matchmaking_queue')
      .select('user_id')
      .limit(1);
    
    if (queueError) {
      if (queueError.code === '42703') {
        console.log('⚠️  matchmaking_queue table still uses student_id column');
        return false;
      } else {
        console.log('❓ matchmaking_queue table status unclear:', queueError.message);
      }
    } else {
      console.log('✅ matchmaking_queue table uses user_id column');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking table schema:', error);
    return false;
  }
}

async function runCheck() {
  try {
    const usersTableExists = await createUsersTable();
    
    if (usersTableExists) {
      await checkVideoTablesSchema();
      console.log('\n🎉 Schema check completed!');
    }
    
  } catch (err) {
    console.error('💥 Error:', err);
  }
}

runCheck();