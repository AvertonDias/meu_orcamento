"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PermissionRequest {
  title: string;
  description: string;
  actionLabel?: string;
  cancelLabel?: string;
}

interface PermissionDialogContextType {
  requestPermission: (request: PermissionRequest) => Promise<boolean>;
}

const PermissionDialogContext = createContext<PermissionDialogContextType | undefined>(undefined);

export function PermissionDialogProvider({ children }: { children: ReactNode }) {
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const requestPermission = useCallback((request: PermissionRequest) => {
    return new Promise<boolean>((resolve) => {
      setPermissionRequest(request);
      setResolver(() => resolve);
    });
  }, []);

  const handleResolve = (value: boolean) => {
    resolver?.(value);
    setPermissionRequest(null);
    setResolver(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleResolve(false);
    }
  };

  return (
    <PermissionDialogContext.Provider value={{ requestPermission }}>
      {children}
      <AlertDialog open={!!permissionRequest} onOpenChange={handleOpenChange}>
        {permissionRequest && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{permissionRequest.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {permissionRequest.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handleResolve(false)}>
                {permissionRequest.cancelLabel || 'Agora não'}
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => handleResolve(true)}>
                {permissionRequest.actionLabel || 'Permitir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </PermissionDialogContext.Provider>
  );
}

export function usePermissionDialog() {
  const context = useContext(PermissionDialogContext);
  if (context === undefined) {
    throw new Error('usePermissionDialog must be used within a PermissionDialogProvider');
  }
  return context;
}
