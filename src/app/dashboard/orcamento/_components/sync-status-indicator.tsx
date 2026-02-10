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

  const getTooltipContent = () => {
    if (!isClient) return 'Carregando...';
    if (errorCount > 0) return `${errorCount} item(s) com erro de sincronização. Tente forçar a sincronização.`;
    if (!isOnline) return 'Você está offline. As alterações serão sincronizadas quando você se conectar.';
    if (isSyncing) return `Sincronizando ${pendingCount > 0 ? `${pendingCount} item(s)` : ''}...`;
    if (pendingCount > 0) return `${pendingCount} ${pendingCount === 1 ? 'item pendente' : 'itens pendentes'} para sincronizar.`;
    if (lastSync) return `Sincronizado. Última vez: ${formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}`;
    return 'Conectado e sincronizado.';
  };

  const getVariant = () => {
    if (!isClient) return 'secondary';
    if (errorCount > 0) return 'destructive';
    if (!isOnline) return 'destructive';
    if (isSyncing || pendingCount > 0) return 'secondary';
    return 'default';
  };

  const getStatusText = () => {
    if (!isClient) return 'Carregando...';
    if (errorCount > 0) return 'Erro';
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Sincronizando...';
    if (pendingCount > 0) return 'Pendente';
    return 'Sincronizado';
  };
  
  const icon = () => {
    if (!isClient || isSyncing) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (errorCount > 0) return <AlertCircle className="h-4 w-4" />;
    if (!isOnline) return <CloudOff className="h-4 w-4" />;
    return <Cloud className="h-4 w-4" />;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help inline-block">
              <Badge
                variant={getVariant()}
                className="flex items-center gap-2"
              >
                {icon()}
                <span className="hidden sm:inline">
                  {getStatusText()}
                </span>
                {(isClient && pendingCount > 0 && !isSyncing && errorCount === 0) && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
                )}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipContent()}</p>
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
