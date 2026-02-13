'use client';

import React, { useState, useEffect } from 'react';
import { useSync } from '@/hooks/useSync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Cloud, CloudOff, Loader2, RefreshCcw, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, pendingCount, errorCount, lastSync, forceSync } = useSync();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getStatus = () => {
    if (!isClient) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: 'Carregando...',
        variant: 'secondary' as const,
        tooltip: 'Carregando status da sincronização...',
        pulse: false,
      };
    }
    if (errorCount > 0) {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Erro',
        variant: 'destructive' as const,
        tooltip: `${errorCount} item(s) com erro de sincronização. Tente forçar a sincronização.`,
        pulse: false,
      };
    }
    if (!isOnline) {
      return {
        icon: <CloudOff className="h-4 w-4" />,
        text: 'Offline',
        variant: 'destructive' as const,
        tooltip: 'Você está offline. As alterações serão sincronizadas quando você se conectar.',
        pulse: false,
      };
    }
    if (isSyncing) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: 'Sincronizando...',
        variant: 'secondary' as const,
        tooltip: `Sincronizando ${pendingCount > 0 ? `${pendingCount} item(s)` : ''}...`,
        pulse: false,
      };
    }
    if (pendingCount > 0) {
        return {
            icon: <Cloud className="h-4 w-4" />,
            text: 'Pendente',
            variant: 'secondary' as const,
            tooltip: `${pendingCount} ${pendingCount === 1 ? 'item pendente' : 'itens pendentes'} para sincronizar.`,
            pulse: true,
        }
    }
    return {
      icon: <Cloud className="h-4 w-4" />,
      text: 'Sincronizado',
      variant: 'default' as const,
      tooltip: lastSync ? `Sincronizado. Última vez: ${formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}` : 'Conectado e sincronizado.',
      pulse: false,
    };
  };

  const status = getStatus();

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help inline-block">
              <Badge
                variant={status.variant}
                className="flex items-center gap-2"
              >
                {status.icon}
                <span className="hidden sm:inline">
                  {status.text}
                </span>
                {status.pulse && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
                )}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{status.tooltip}</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={forceSync}
              disabled={!isClient || isSyncing || !isOnline}
              className="h-7 w-7"
            >
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Sincronizar manualmente</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Forçar Sincronização</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
