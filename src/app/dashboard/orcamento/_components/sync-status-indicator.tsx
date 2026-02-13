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

  // On the server, and on the first client render, we'll show a loading state.
  if (!isClient) {
    return (
        <div className="flex items-center justify-end gap-2">
            <Badge variant="secondary" className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Carregando...</span>
            </Badge>
            <Button variant="ghost" size="icon" disabled className="h-7 w-7">
                <RefreshCcw className="h-4 w-4" />
            </Button>
      </div>
    );
  }

  // After hydration, we render the actual status.
  const StatusIcon = () => {
    if (isSyncing) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (errorCount > 0) return <AlertCircle className="h-4 w-4" />;
    if (!isOnline) return <CloudOff className="h-4 w-4" />;
    return <Cloud className="h-4 w-4" />;
  };

  const statusText =
    errorCount > 0 ? 'Erro' :
    !isOnline ? 'Offline' :
    isSyncing ? 'Sincronizando...' :
    pendingCount > 0 ? 'Pendente' :
    'Sincronizado';

  const badgeVariant =
    errorCount > 0 || !isOnline ? 'destructive' :
    isSyncing || pendingCount > 0 ? 'secondary' :
    'default';
  
  const tooltipContent =
    errorCount > 0 ? `${errorCount} item(s) com erro de sincronização. Tente forçar a sincronização.` :
    !isOnline ? 'Você está offline. As alterações serão sincronizadas quando você se conectar.' :
    isSyncing ? `Sincronizando ${pendingCount > 0 ? `${pendingCount} item(s)` : ''}...` :
    pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? 'item pendente' : 'itens pendentes'} para sincronizar.` :
    lastSync ? `Sincronizado. Última vez: ${formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}` :
    'Conectado e sincronizado.';

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help inline-block">
              <Badge
                variant={badgeVariant}
                className="flex items-center gap-2"
              >
                <StatusIcon />
                <span className="hidden sm:inline">
                  {statusText}
                </span>
                {(pendingCount > 0 && !isSyncing && errorCount === 0) && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
                )}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={forceSync}
              disabled={isSyncing || !isOnline}
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
