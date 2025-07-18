'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldAlert, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminIngestionForm } from './admin-ingestion-form';
import { useAdminAccess } from '../hooks/use-admin-access';

export function AdminSection() {
  const { 
    isLoading, 
    isAuthenticated, 
    hasAdminAccess,
    user,
    simulateLogin,
    simulateLogout,
  } = useAdminAccess();
  
  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }
  
  // Show nothing if user is not authenticated
  if (!isAuthenticated) {
    return (
      <Alert className="border-muted">
        <LogIn className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Please sign in to access admin features</span>
          {/* Demo login button - remove in production */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => simulateLogin('user')}
            >
              Demo: Login as User
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => simulateLogin('admin')}
            >
              Demo: Login as Admin
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  // Show access denied if user doesn't have admin permissions
  if (!hasAdminAccess) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <ShieldAlert className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 flex items-center justify-between">
          <span>Admin access required. Current role: {user?.role || 'user'}</span>
          {/* Demo logout button - remove in production */}
          <Button 
            size="sm" 
            variant="outline"
            onClick={simulateLogout}
          >
            Demo: Logout
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  // Render admin content
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Admin Controls</span>
          {user?.email && (
            <span className="ml-2 text-xs">({user.email})</span>
          )}
        </div>
        {/* Demo logout button - remove in production */}
        <Button 
          size="sm" 
          variant="ghost"
          onClick={simulateLogout}
        >
          Demo: Logout
        </Button>
      </div>
      
      <AdminIngestionForm 
        onSuccess={() => {
          console.log('Ingestion completed successfully');
          // You could trigger a refresh of the leads data here
        }}
      />
    </div>
  );
}