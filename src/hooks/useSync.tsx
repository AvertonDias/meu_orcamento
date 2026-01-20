
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, where, query } from 'firebase/firestore';

import { db as dexieDB, type SyncableCollection } from '@/lib/dexie';
import { db as firestoreDB, auth } from '@/lib/firebase';
import { useToast } from './use-toast';
import { useLocalStorage } from './useLocalStorage';

import { syncClienteToFirestore, deleteClienteFromFirestore } from '@/services/clientesService';
import { syncMaterialToFirestore, deleteMaterialFromFirestore } from '@/services/materiaisService';
import { syncOrcamentoToFirestore, deleteOrcamentoFromFirestore, updateOrcamento, updateOrcamentoStatus } from '@/services/orcamentosService';
import { syncEmpresaToFirestore } from '@/services/empresaService';
import { addDays, differenceInHours, isPast, parseISO } from 'date-fns';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const syncFunctions: Record<SyncableCollection, (data: any) => Promise<void>> = {
  clientes: syncClienteToFirestore,
  materiais: syncMaterialToFirestore,
  orcamentos: syncOrcamentoToFirestore,
  empresa: syncEmpresaToFirestore,
};

const deleteFunctions: Record<string, (id: string) => Promise<void>> = {
  clientes: deleteClienteFromFirestore,
  materiais: deleteMaterialFromFirestore,
  orcamentos: deleteOrcamentoFromFirestore,
};

// Singleton hook state
let isSyncingGlobally = false;
const listeners = new Set<(isSyncing: boolean) => void>();

const setIsSyncing = (syncing: boolean) => {
  isSyncingGlobally = syncing;
  listeners.forEach(listener => listener(syncing));
};

export function useSync() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const router = useRouter();

  const [isOnline, setIsOnline] = useState(true);
  const [isSyncingState, setIsSyncingState] = useState(isSyncingGlobally);
  const [lastSync, setLastSync] = useLocalStorage<string | null>('lastSyncTime', null);

  const initialPullDone = useRef(false);

  const orcamentosSalvos = useLiveQuery(
    () => user ? dexieDB.orcamentos.where('userId').equals(user.uid).toArray() : [],
    [user]
  )?.map(o => o.data);


  useEffect(() => {
    const listener = (syncing: boolean) => setIsSyncingState(syncing);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const syncState = useLiveQuery(async () => {
    if (!user) return { pendingCount: 0, errorCount: 0 };

    const collections: SyncableCollection[] = ['clientes', 'materiais', 'orcamentos', 'empresa'];
    let pendingCount = 0;
    let errorCount = 0;

    for (const collectionName of collections) {
        const pending = await (dexieDB as any)[collectionName].where({ syncStatus: 'pending', userId: user.uid }).count();
        const error = await (dexieDB as any)[collectionName].where({ syncStatus: 'error', userId: user.uid }).count();
        pendingCount += pending;
        errorCount += error;
    }

    const deletions = await dexieDB.deletions.where('userId').equals(user.uid).count();
    pendingCount += deletions; // Deletions are always considered pending until processed

    return { pendingCount, errorCount };
  }, [user]);


  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // =========================
  // NOTIFICAÇÃO E STATUS DE VENCIMENTO
  // =========================
  useEffect(() => {
    if (!orcamentosSalvos || !user) return;
  
    const now = new Date();
  
    orcamentosSalvos.forEach(async orc => {
      if (orc.status !== 'Pendente') return;
  
      const validade = Number(orc.validadeDias);
      if (!validade) return;
  
      const dataCriacao = parseISO(orc.dataCriacao);
      const dataValidade = addDays(dataCriacao, validade);
      
      if (isPast(dataValidade)) {
        await updateOrcamentoStatus(orc.id, 'Vencido', {});
        return;
      }
  
      const horas = differenceInHours(dataValidade, now);
      if (horas > 0 && horas <= 24 && !orc.notificacaoVencimentoEnviada) {

        const toastAction = (
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => router.push(`/dashboard/orcamento?clienteId=${orc.cliente.id}`)}
          >
            Ver
          </Button>
        );

        toast({
          title: "Orçamento prestes a vencer!",
          description: `O orçamento #${orc.numeroOrcamento} para ${orc.cliente.nome} de ${formatCurrency(orc.totalVenda)} está próximo de expirar.`,
          duration: 15000,
          action: toastAction,
        });

        if (Capacitor.isNativePlatform()) {
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: new Date().getTime(),
                  title: 'Orçamento quase vencendo',
                  body: `Orçamento #${orc.numeroOrcamento} para ${orc.cliente.nome}`,
                  schedule: { at: new Date(Date.now() + 1000) },
                },
              ],
            });
          } catch(e) {
            console.error("Erro ao agendar notificação local:", e);
          }
        }
        
        await updateOrcamento(orc.id, { notificacaoVencimentoEnviada: true });
      }
    });
  }, [orcamentosSalvos, user, toast, router]);


  const pushToFirestore = useCallback(async () => {
    if (!user || !isOnline || isSyncingGlobally) return;

    setIsSyncing(true);
    try {
      const collections: SyncableCollection[] = ['empresa', 'clientes', 'materiais', 'orcamentos'];
      for (const collectionName of collections) {
        const items = await (dexieDB as any)[collectionName]
          .where({ syncStatus: 'pending', userId: user.uid })
          .or('syncStatus').equals('error') // Tenta sincronizar itens com erro também
          .toArray();
        for (const item of items) {
          try {
            await syncFunctions[collectionName](item.data);
            await (dexieDB as any)[collectionName].update(item.id, { syncStatus: 'synced', syncError: null });
          } catch (error) {
            await (dexieDB as any)[collectionName].update(item.id, { syncStatus: 'error', syncError: String(error) });
          }
        }
      }

      const deletions = await dexieDB.deletions.where('userId').equals(user.uid).toArray();
      for (const item of deletions) {
        try {
          const fn = deleteFunctions[item.collection];
          if (fn) await fn(item.id);
          await dexieDB.deletions.delete(item.id);
        } catch (error) {
          console.error('Erro ao sincronizar exclusão', error);
        }
      }

      setLastSync(new Date().toISOString());
    } finally {
      setIsSyncing(false);
    }
  }, [user, isOnline, setLastSync]);

  const pullFromFirestore = useCallback(async () => {
    if (!user || !isOnline || isSyncingGlobally) return;

    setIsSyncing(true);
    try {
      const collections: SyncableCollection[] = ['clientes', 'materiais', 'orcamentos', 'empresa'];
      for (const coll of collections) {
        const localTable = (dexieDB as any)[coll];
        const q = query(collection(firestoreDB, coll), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const firestoreItems = snapshot.docs.map(doc => ({
            id: doc.id,
            userId: user.uid,
            data: doc.data(),
            syncStatus: 'synced',
            syncError: null,
          }));
          await localTable.bulkPut(firestoreItems);
        }
      }
      setLastSync(new Date().toISOString());
    } catch (error) {
      console.error("Erro ao puxar dados do Firestore:", error);
      toast({ title: 'Erro ao buscar dados da nuvem.', variant: 'destructive' });
    } finally {
      initialPullDone.current = true;
      setIsSyncing(false);
    }
  }, [user, isOnline, setLastSync, toast]);

  const forceSync = useCallback(async () => {
    if (isSyncingGlobally) {
      toast({ title: 'Sincronização já em andamento.' });
      return;
    }
    toast({ title: 'Iniciando sincronização manual...' });
    await pushToFirestore();
    await pullFromFirestore();
    toast({ title: 'Sincronização concluída!' });
  }, [pushToFirestore, pullFromFirestore, toast]);


  useEffect(() => {
    if (isOnline && user && !initialPullDone.current) {
      pullFromFirestore();
    }
  }, [isOnline, user, pullFromFirestore]);

  useEffect(() => {
    const count = syncState?.pendingCount ?? 0;
    const errorCount = syncState?.errorCount ?? 0;
    if ((count > 0 || errorCount > 0) && isOnline && !isSyncingGlobally) {
      pushToFirestore();
    }
  }, [syncState, isOnline, pushToFirestore]);

  return {
    isOnline,
    isSyncing: isSyncingState,
    pendingCount: syncState?.pendingCount ?? 0,
    errorCount: syncState?.errorCount ?? 0,
    lastSync,
    forceSync,
  };
}
