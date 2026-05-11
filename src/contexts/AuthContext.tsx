import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: {
    role: UserRole;
    full_name: string;
    organization_name: string;
    city: string;
    phone?: string;
    website_url?: string;
  }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, retries = 3): Promise<void> => {
    console.log(`[Auth] Fetching profile for ${userId}, retries left: ${retries}`);
    
    // Safety timeout for the fetch itself
    const fetchPromise = supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    try {
      const { data, error } = await Promise.race([
        fetchPromise,
        new Promise<{ data: null; error: any }>((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        )
      ]);
      
      if (data) {
        console.log('[Auth] Profile found:', data.role);
        setProfile(data);
      } else if (retries > 0) {
        console.warn('[Auth] Profile not found, retrying in 1s...');
        await new Promise((r) => setTimeout(r, 1000));
        return fetchProfile(userId, retries - 1);
      } else {
        console.error('[Auth] Failed to fetch profile after retries', error);
      }
    } catch (err) {
      console.error('[Auth] Profile fetch error:', err);
    }
  };

  useEffect(() => {
    // 1. Check for initial session immediately
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('[Auth] Initial session check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 2. Set up listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: {
    role: UserRole;
    full_name: string;
    organization_name: string;
    city: string;
    phone?: string;
    website_url?: string;
  }) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: (error instanceof Error ? error : new Error('Network error. Please try again.')) as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Return a cleaner error object
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (error) {
      return { error: (error instanceof Error ? error : new Error('Network error. Please try again.')) };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile: () => user ? fetchProfile(user.id) : Promise.resolve() }}>
      {children}
    </AuthContext.Provider>
  );
};
