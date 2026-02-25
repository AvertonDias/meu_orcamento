'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    
    // Check if the app is already running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsAppInstalled(true);
    }
    
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the default browser prompt
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null); // Clear the prompt
      toast({ title: "Aplicativo instalado com sucesso!" });
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!installPrompt) {
        toast({
            title: 'Instalação não disponível',
            description: 'Seu navegador não suporta a instalação ou o app já foi instalado.',
            variant: 'destructive'
        });
        return;
    }
    
    // Show the browser's install prompt
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'dismissed') {
        toast({
            title: 'Instalação cancelada',
            description: 'Você pode instalar o app a qualquer momento.'
        });
    }

    // We've used the prompt, and can't use it again, so clear it
    setInstallPrompt(null);
  };
  
  // Don't show the button if not on client, or if the app is already installed or the prompt is not available
  if (!isClient || isAppInstalled || !installPrompt) {
    return null;
  }

  return (
    <Button
      onClick={handleInstallClick}
      variant="outline"
    >
      <Download className="mr-2 h-4 w-4" />
      Instalar Aplicativo
    </Button>
  );
}
