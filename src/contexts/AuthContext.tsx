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
      // Set the anonymous_id for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.anonymous_id',
        setting_value: anonymousId
      });

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading student:', error);
      } else if (data) {
        setStudent(data);
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
      
      // Set the anonymous_id for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.anonymous_id',
        setting_value: anonymousId
      });

      // Try to get existing student
      let { data: existingStudent } = await supabase
        .from('students')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .single();

      if (!existingStudent) {
        // Create new student
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert({
            anonymous_id: anonymousId,
            role: isAdmin ? 'admin' : 'student'
          })
          .select()
          .single();

        if (error) throw error;
        existingStudent = newStudent;
      }

      setStudent(existingStudent);
      localStorage.setItem('anonymous_id', anonymousId);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setStudent(null);
    localStorage.removeItem('anonymous_id');
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