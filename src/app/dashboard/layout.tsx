'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Contacts } from '@capacitor-community/contacts';

import { PwaManager } from '@/components/pwa-install-button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DesktopSidebar } from '@/components/layout/desktop-sidebar';
import { MobileNavbar } from '@/components/layout/mobile-navbar';

import { usePermissionDialog, PermissionDialogProvider } from '@/hooks/use-permission-dialog';
import { requestForToken } from '@/lib/fcm';
import { useSync } from '@/hooks/useSync';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocalStorage } from '@/hooks/useLocalStorage';

import { DirtyStateProvider, useDirtyState } from '@/contexts/dirty-state-context';
import { useToast } from '@/hooks/use-toast';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';


function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [user, loadingAuth] = useAuthState(auth);
  
  // Use a query that returns an array to distinguish "loading" from "not found"
  const empresaDataArr = useLiveQuery(
    () => (user ? db.empresa.where('id').equals(user.uid).toArray() : []),
    [user]
  );

  const empresaDexie = empresaDataArr?.[0];
  const dexieIsLoading = empresaDataArr === undefined;
  
  const { requestPermission } = usePermissionDialog();
  const { isDirty, setIsDirty } = useDirtyState();
  const oneTimeSetupDone = useRef(false);
  
  // Inicializa sincronização offline/online
  useSync();

  /* =====================================================
     ANDROID – BOTÃO VOLTAR
  ====================================================== */
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const handler = CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
      const modalOpen = document.querySelector(
        '[data-radix-collection-item][data-state="open"]'
      );

      if (modalOpen) return;

      if (isDirty) {
        const discard = await requestPermission({
          title: "Você tem alterações não salvas",
          description: "Deseja sair da página e descartar as alterações feitas?",
          actionLabel: "Sair e Descartar",
          cancelLabel: "Permanecer"
        });
        
        if (!discard) return; // Se não descartar, não faz nada
        
        setIsDirty(false); // Se descartar, limpa o estado
      }

      if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      handler.remove();
    };
  }, [isDirty, setIsDirty, requestPermission]);

  /* =====================================================
     PERMISSÕES DO APP
  ====================================================== */
  const requestAppPermissions = async () => {
    /* ---------- NATIVE (APK) ---------- */
    if (Capacitor.isNativePlatform()) {
      // 🔔 Notificações (Android)
      let notifStatus = await LocalNotifications.checkPermissions();
      if (notifStatus.display !== 'granted') {
        const rationale = notifStatus.display === 'denied' 
          ? 'Para receber alertas importantes sobre orçamentos, você precisa ativar as notificações nas configurações do aplicativo.'
          : 'Deseja receber notificações sobre orçamentos, como lembretes de vencimento e alertas de estoque?';
        
        const granted = await requestPermission({
          title: 'Receber Alertas Importantes?',
          description: rationale,
        });

        if (granted) {
          if (notifStatus.display === 'denied') {
            if ('openAppSettings' in CapacitorApp && typeof CapacitorApp.openAppSettings === 'function') {
              await CapacitorApp.openAppSettings();
            } else {
              toast({ title: 'Ação necessária', description: 'Por favor, abra as configurações do aplicativo e ative as notificações manualmente.', duration: 5000 });
            }
          } else {
            await LocalNotifications.requestPermissions();
          }
        }
      }

      // 📇 Contatos (Android)
      let contactsStatus = await Contacts.checkPermissions();
      if (contactsStatus.contacts !== 'granted') {
         const rationale = contactsStatus.contacts === 'denied'
          ? 'Para importar clientes da agenda, o aplicativo precisa de acesso aos seus contatos. Ative a permissão nas configurações.'
          : 'Para adicionar clientes rapidamente, o aplicativo pode acessar sua agenda de contatos. Deseja permitir?';
        
        const granted = await requestPermission({
          title: 'Importar Clientes da Agenda?',
          description: rationale,
        });

        if (granted) {
          if (contactsStatus.contacts === 'denied') {
            if ('openAppSettings' in CapacitorApp && typeof CapacitorApp.openAppSettings === 'function') {
               await CapacitorApp.openAppSettings();
            } else {
               toast({ title: 'Ação necessária', description: 'Por favor, abra as configurações do aplicativo e ative a permissão de contatos.', duration: 5000 });
            }
          } else {
            await Contacts.requestPermissions();
          }
        }
      }

    } 
    /* ---------- WEB / PWA ---------- */
    else {
      if ('Notification' in window && Notification.permission === 'default') {
         const granted = await requestPermission({
            title: 'Receber Alertas Importantes?',
            description: 'Deseja receber notificações sobre orçamentos, como lembretes de vencimento e alertas de estoque?',
         });

         if (granted) {
            await Notification.requestPermission();
         }
      }
    }
  };


  /* =====================================================
     AUTH & REDIRECTION
  ====================================================== */
  useEffect(() => {
    // Aguarda a autenticação e o carregamento inicial dos dados do Dexie.
    if (loadingAuth || (user && dexieIsLoading)) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    // Executa configurações de primeira execução (como pedir permissões) apenas uma vez.
    if (!oneTimeSetupDone.current) {
      requestAppPermissions();
      // requestForToken(); // Habilitar se o FCM estiver totalmente configurado
      oneTimeSetupDone.current = true;
    }
    
    // A verificação robusta para garantir que a empresa está configurada.
    const hasName = !!(empresaDexie?.data?.nome && empresaDexie.data.nome.trim().length > 0);
    const hasAddress = !!(empresaDexie?.data?.endereco && empresaDexie.data.endereco.trim().length > 0);
    const hasPhone = !!(empresaDexie?.data?.telefones && empresaDexie.data.telefones.some(t => t.numero && t.numero.trim().length > 0));
    const isCompanyConfigured = hasName && hasAddress && hasPhone;
    
    const isConfigPage = pathname === '/dashboard/configuracoes';

    // Se a empresa não estiver configurada e não estivermos na página de configuração, redireciona.
    if (!isCompanyConfigured && !isConfigPage) {
      router.push('/dashboard/configuracoes');
      toast({
        title: 'Bem-vindo(a)!',
        description: 'Por favor, complete as informações da sua empresa para começar.',
        duration: 9000,
      });
    }

  }, [user, loadingAuth, dexieIsLoading, router, empresaDexie, pathname, toast]);


  /* =====================================================
     LOADING
  ====================================================== */
  // Mostra um spinner de carregamento durante a autenticação ou o fetch inicial de dados do Dexie.
  if (loadingAuth || (user && dexieIsLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* =====================================================
     LAYOUT
  ====================================================== */
  return (
    <TooltipProvider>
      <PwaManager />

      <div className="flex min-h-screen w-full">

        <DesktopSidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        <div
          className={cn(
            'flex flex-col flex-1 transition-all duration-300 ease-in-out',
            isSidebarCollapsed
              ? 'md:pl-[60px]'
              : 'md:pl-[220px] lg:pl-[280px]'
          )}
        >
          <MobileNavbar />

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}


export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <DirtyStateProvider>
      <PermissionDialogProvider>
        <MainLayoutContent>{children}</MainLayoutContent>
      </PermissionDialogProvider>
    </DirtyStateProvider>
  );
}
