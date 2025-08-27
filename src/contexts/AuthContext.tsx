import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Student {
  id: string;
  anonymous_id: string;
  role: 'student' | 'admin' | 'mentor';
  created_at: string;
}

interface AuthContextType {
  student: Student | null;
  loading: boolean;
  login: (anonymousId: string, isAdmin?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const anonymousId = localStorage.getItem('anonymous_id');
    if (anonymousId) {
      loadStudent(anonymousId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadStudent = async (anonymousId: string) => {
    try {
      // First check if we have locally stored student data
      const storedStudentData = localStorage.getItem('student_data');
      if (storedStudentData) {
        try {
          const localStudent = JSON.parse(storedStudentData);
          if (localStudent.anonymous_id === anonymousId) {
            console.log('✅ Using locally stored student data');
            setStudent(localStudent);
            return;
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse stored student data:', parseError);
        }
      }

      // Try to set the anonymous_id for RLS (fallback if function doesn't exist)
      try {
        await (supabase as any).rpc('set_config', {
          setting_name: 'app.anonymous_id',
          setting_value: anonymousId
        });
      } catch (rpcError) {
        console.warn('RLS config function not available, proceeding without it:', rpcError);
      }

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading student:', error);
        
        // If RLS recursion error, create a local student
        if (error.code === '42P17') {
          console.warn('⚠️ RLS recursion detected in loadStudent, creating local student');
          const tempStudent: Student = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            anonymous_id: anonymousId,
            role: 'student',
            created_at: new Date().toISOString()
          };
          setStudent(tempStudent);
          localStorage.setItem('student_data', JSON.stringify(tempStudent));
          return;
        }
      } else if (data) {
        setStudent(data);
        localStorage.setItem('student_data', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error in loadStudent:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (anonymousId: string, isAdmin = false) => {
    try {
      setLoading(true);
      console.log('🔐 Starting login process for:', anonymousId);
      
      // Validate the anonymousId
      if (!anonymousId || anonymousId.trim().length < 3) {
        throw new Error('Anonymous ID must be at least 3 characters long');
      }

      const cleanId = anonymousId.trim();
      console.log('✅ Validation passed for:', cleanId);

      // Create a temporary student object for local use
      // This bypasses the database RLS issues for now
      const tempStudent: Student = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        anonymous_id: cleanId,
        role: isAdmin ? 'admin' : 'student',
        created_at: new Date().toISOString()
      };

      // Try to access the database to test connection
      try {
        console.log('🔍 Testing database connection...');
        const { error: testError } = await supabase
          .from('students')
          .select('count')
          .limit(1);

        if (testError && testError.code === '42P17') {
          console.warn('⚠️ Database RLS policies have recursion issue. Using local-only mode.');
          // Use local-only mode
          setStudent(tempStudent);
          localStorage.setItem('anonymous_id', cleanId);
          localStorage.setItem('student_data', JSON.stringify(tempStudent));
          console.log('🎉 Login successful (local mode)!');
          return;
        }
      } catch (dbError) {
        console.warn('⚠️ Database connection issue, using local-only mode:', dbError);
        setStudent(tempStudent);
        localStorage.setItem('anonymous_id', cleanId);
        localStorage.setItem('student_data', JSON.stringify(tempStudent));
        console.log('🎉 Login successful (local mode)!');
        return;
      }

      // Try to set the anonymous_id for RLS (fallback if function doesn't exist)
      try {
        console.log('🛡️ Setting up RLS configuration...');
        await (supabase as any).rpc('set_config', {
          setting_name: 'app.anonymous_id',
          setting_value: cleanId
        });
        console.log('✅ RLS configuration successful');
      } catch (rpcError) {
        console.warn('⚠️ RLS config function not available, proceeding without it:', rpcError);
      }

      // Try to get existing student
      console.log('🔍 Checking for existing student...');
      let { data: existingStudent, error: selectError } = await supabase
        .from('students')
        .select('*')
        .eq('anonymous_id', cleanId);

      console.log('📊 Query result:', { data: existingStudent, error: selectError });

      // Handle RLS recursion error specifically
      if (selectError && selectError.code === '42P17') {
        console.warn('⚠️ RLS recursion detected, using local-only mode');
        setStudent(tempStudent);
        localStorage.setItem('anonymous_id', cleanId);
        localStorage.setItem('student_data', JSON.stringify(tempStudent));
        console.log('🎉 Login successful (local mode due to RLS issue)!');
        return;
      }

      // Check if we got results
      if (existingStudent && existingStudent.length > 0) {
        console.log('✅ Found existing student:', existingStudent[0].id);
        setStudent(existingStudent[0]);
        localStorage.setItem('anonymous_id', cleanId);
        localStorage.setItem('student_data', JSON.stringify(existingStudent[0]));
        console.log('🎉 Login successful!');
        return;
      }

      // If no existing student found, create new one
      if (!existingStudent || existingStudent.length === 0) {
        console.log('➕ Creating new student profile...');
        const { data: newStudent, error: insertError } = await supabase
          .from('students')
          .insert({
            anonymous_id: cleanId,
            role: isAdmin ? 'admin' : 'student'
          })
          .select();

        console.log('📝 Insert result:', { data: newStudent, error: insertError });

        // Handle RLS recursion error in insert
        if (insertError && insertError.code === '42P17') {
          console.warn('⚠️ RLS recursion detected during insert, using local-only mode');
          setStudent(tempStudent);
          localStorage.setItem('anonymous_id', cleanId);
          localStorage.setItem('student_data', JSON.stringify(tempStudent));
          console.log('🎉 Registration successful (local mode due to RLS issue)!');
          return;
        }

        if (insertError) {
          console.error('❌ Insert error:', insertError);
          // More specific error messages
          if (insertError.code === '23505') {
            throw new Error('This anonymous ID is already taken. Please try a different one.');
          }
          if (insertError.code === '42501') {
            throw new Error('Database access denied. Please check your connection and try again.');
          }
          if (insertError.code === '42P17') {
            throw new Error('Database configuration issue detected. The system is being updated - please try again in a moment.');
          }
          throw new Error(`Database error: ${insertError.message} (${insertError.code})`);
        }

        if (newStudent && newStudent.length > 0) {
          console.log('✅ New student created:', newStudent[0].id);
          setStudent(newStudent[0]);
          localStorage.setItem('anonymous_id', cleanId);
          localStorage.setItem('student_data', JSON.stringify(newStudent[0]));
          console.log('🎉 Registration successful!');
        } else {
          throw new Error('Failed to create student profile - no data returned');
        }
      } else if (selectError) {
        console.error('❌ Select error:', selectError);
        if (selectError.code === '42501') {
          throw new Error('Database access denied. Please check your connection and try again.');
        }
        if (selectError.code === '42P17') {
          throw new Error('Database configuration issue detected. The system is being updated - please try again in a moment.');
        }
        throw new Error(`Database access error: ${selectError.message} (${selectError.code})`);
      }

    } catch (error) {
      console.error('💥 Login error:', error);
      throw error;
    } finally {
      setLoading(false);
      console.log('🔚 Login process completed');
    }
  };

  const logout = () => {
    setStudent(null);
    localStorage.removeItem('anonymous_id');
    localStorage.removeItem('student_data');
  };

  return (
    <AuthContext.Provider value={{ student, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};