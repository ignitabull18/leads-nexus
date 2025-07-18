'use client';

import { useState, useEffect } from 'react';

// Interface for user session - adapt this to match your auth provider
interface UserSession {
  user?: {
    id: string;
    email: string;
    role?: string;
    permissions?: string[];
  };
  expires?: string;
}

/**
 * Hook to check if the current user has admin access
 * This is a flexible implementation that can be adapted to different auth providers
 */
export function useAdminAccess() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      // TODO: Replace with actual authentication check
      // Examples for different auth providers:
      
      // Next-Auth:
      // const session = await getSession();
      
      // Supabase:
      // const { data: { session } } = await supabase.auth.getSession();
      
      // Custom auth:
      // const response = await fetch('/api/auth/session');
      // const session = await response.json();
      
      // For now, check localStorage for demo purposes
      const demoSession = localStorage.getItem('demo_session');
      if (demoSession) {
        setSession(JSON.parse(demoSession));
      }
      
    } catch (error) {
      console.error('Failed to check user session:', error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has admin access based on role or permissions
  const hasAdminAccess = (() => {
    if (!session?.user) return false;
    
    // Check by role
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      return true;
    }
    
    // Check by permissions
    if (session.user.permissions?.includes('admin') || 
        session.user.permissions?.includes('leads:manage')) {
      return true;
    }
    
    // Check by email domain (example for organization-specific admin)
    if (session.user.email?.endsWith('@admin.example.com')) {
      return true;
    }
    
    return false;
  })();

  const isAuthenticated = !!session?.user;

  // Demo function to simulate login - remove in production
  const simulateLogin = (role: 'admin' | 'user' = 'user') => {
    const mockSession: UserSession = {
      user: {
        id: '123',
        email: role === 'admin' ? 'admin@example.com' : 'user@example.com',
        role: role,
        permissions: role === 'admin' ? ['admin', 'leads:manage'] : ['leads:view'],
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    
    localStorage.setItem('demo_session', JSON.stringify(mockSession));
    setSession(mockSession);
  };

  // Demo function to simulate logout - remove in production
  const simulateLogout = () => {
    localStorage.removeItem('demo_session');
    setSession(null);
  };

  return {
    // Auth state
    isLoading,
    isAuthenticated,
    hasAdminAccess,
    
    // User info
    user: session?.user,
    
    // Demo functions - remove in production
    simulateLogin,
    simulateLogout,
  };
}