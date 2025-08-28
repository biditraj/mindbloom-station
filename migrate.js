// Migration script to convert from student-based to user-based authentication
// Run with: node migrate.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
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

async function runMigration() {
  try {
    console.log('🚀 Starting migration from student-based to user-based authentication...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250828000001_convert_to_user_authentication.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('🔄 Executing migration...');
    
    // Split the migration into individual statements and execute them
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}`);
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error);
          // Continue with other statements for now
        } else {
          console.log(`✅ Statement ${i + 1} completed`);
        }
      }
    }
    
    console.log('🎉 Migration process completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify that the users table was created');
    console.log('2. Check that video chat tables now use user_id columns');
    console.log('3. Test authentication and video chat functionality');
    
  } catch (err) {
    console.error('💥 Error:', err);
  }
}

runMigration();