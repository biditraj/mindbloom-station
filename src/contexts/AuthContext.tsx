import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'student' | 'admin' | 'mentor';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simplified session check with fast timeout
    const checkSession = async () => {
      try {
        console.log('Starting simplified session check...');
        
        // Set a very short timeout for the initial load
        const timeoutId = setTimeout(() => {
          console.log('Session check timeout - proceeding without auth');
          setLoading(false);
        }, 3000); // 3 second timeout
        
        // Try to get session but don't wait forever
        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await sessionPromise;
        
        clearTimeout(timeoutId);
        console.log('Session check completed:', !!session);
        
        if (session?.user) {
          // Quick user creation without database calls
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            role: 'student', // Default role
            created_at: session.user.created_at || new Date().toISOString()
          };
          console.log('User logged in:', userData);
          setUser(userData);
        } else {
          console.log('No session found');
          setUser(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Session check error:', error);
        setUser(null);
        setLoading(false);
      }
    };
    
    checkSession();

    // Simplified auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log('Auth state changed:', event, !!session);
        
        if (session?.user) {
          // Quick user creation without database calls
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            role: 'student', // Default role
            created_at: session.user.created_at || new Date().toISOString()
          };
          setUser(userData);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.user) {
        // Quick user creation without database calls
        const userData: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          role: 'student', // Default role
          created_at: data.user.created_at || new Date().toISOString()
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      
      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || null
          }
        }
      });

      if (error) throw error;
      
      if (data.user) {
        // Quick user creation without database calls
        const userData: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: name || data.user.email?.split('@')[0] || 'User',
          role: 'student', // Default role
          created_at: data.user.created_at || new Date().toISOString()
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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