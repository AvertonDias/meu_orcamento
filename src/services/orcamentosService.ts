'use client';

import { db as firestoreDB } from '@/lib/firebase';
import {
  doc,
  updateDoc as updateDocFirestore,
  deleteDoc as deleteDocFirestore,
  setDoc,
} from 'firebase/firestore';
import { db as dexieDB } from '@/lib/dexie';
import type { Orcamento, ClienteData } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/firebase';
import { getCleanedCliente } from '@/lib/utils';

// --- Funções que interagem com o Dexie (local) ---

export const getNextOrcamentoNumber = async (userId: string): Promise<string> => {
  const currentYear = new Date().getFullYear();
  
  const orcamentosDoAno = await dexieDB.orcamentos
    .where('userId').equals(userId)
    .filter(o => o.data.numeroOrcamento.endsWith(`-${currentYear}`))
    .toArray();

  let lastSequence = 0;
  if (orcamentosDoAno.length > 0) {
    orcamentosDoAno.forEach(o => {
      const seq = parseInt(o.data.numeroOrcamento.split('-')[0], 10);
      if (!isNaN(seq) && seq > lastSequence) {
        lastSequence = seq;
      }
    });
  }

  const newSequence = lastSequence + 1;
  return `${String(newSequence).padStart(3, '0')}-${currentYear}`;
};

export const addOrcamento = async (orcamento: Omit<Orcamento, 'id'>): Promise<string> => {
  if (!orcamento || !orcamento.cliente) {
    throw new Error('Dados do orçamento ou cliente inválidos.');
  }

  // Se o cliente é novo (não tem ID), o ID será o do novo documento criado no addCliente
  const clienteData: ClienteData = {
    ...orcamento.cliente,
    id: orcamento.cliente.id || uuidv4(), // Garante um ID se não houver
    userId: orcamento.userId,
    cpfCnpj: orcamento.cliente.cpfCnpj || '',
    email: orcamento.cliente.email || '',
    endereco: orcamento.cliente.endereco || ''
  };

  const newId = uuidv4();
  const dataToSave: Orcamento = {
    ...orcamento,
    id: newId,
    cliente: clienteData,
    observacoes: orcamento.observacoes || '',
    observacoesInternas: orcamento.observacoesInternas || '',
    dataConclusao: null,
  };

  await dexieDB.orcamentos.put({
    id: newId,
    userId: orcamento.userId,
    data: dataToSave,
    syncStatus: 'pending',
  });

  return newId;
};

export const updateOrcamento = async (orcamentoId: string, orcamento: Partial<Orcamento>) => {
  try {
    if (!orcamentoId || typeof orcamentoId !== 'string') {
      console.warn("updateOrcamento ignorado - ID inválido:", orcamentoId);
      return;
    }
    
    const existing = await dexieDB.orcamentos.get(orcamentoId);
    if (!existing) throw new Error("Orçamento não encontrado para atualização.");
    
    // Create a new clean data object by merging. The `orcamento` partial from the UI has precedence.
    const mergedData = { ...existing.data, ...orcamento };

    // Reconstruct the object to ensure a clean structure, removing any flattened properties
    const finalData: Orcamento = {
      id: orcamentoId,
      userId: existing.data.userId,
      numeroOrcamento: mergedData.numeroOrcamento,
      // The `orcamento` partial update should contain the full, correct client object after editing
      // We use it as the source of truth, cleaning it for safety.
      cliente: getCleanedCliente(mergedData.cliente, existing.data.userId), 
      itens: mergedData.itens,
      totalVenda: mergedData.totalVenda,
      dataCriacao: existing.data.dataCriacao, // Never update creation date
      status: mergedData.status,
      validadeDias: mergedData.validadeDias,
      observacoes: mergedData.observacoes || '',
      observacoesInternas: mergedData.observacoesInternas || '',
      dataAceite: mergedData.dataAceite,
      dataRecusa: mergedData.dataRecusa,
      dataConclusao: mergedData.dataConclusao,
      notificacaoVencimentoEnviada: mergedData.notificacaoVencimentoEnviada,
    };

    await dexieDB.orcamentos.put({
      ...existing,
      data: finalData,
      syncStatus: 'pending',
    });
  } catch (error: any) {
    console.error("Erro em updateOrcamento:", error);
    throw new Error(error.message || "Falha ao salvar a edição do orçamento.");
  }
};

export const updateOrcamentoStatus = async (
  budgetId: string,
  status: Orcamento['status'],
  payload: object
) => {
  try {
    if (!budgetId || typeof budgetId !== 'string') {
        console.warn("updateOrcamentoStatus ignorado - ID inválido:", budgetId);
        return;
    }

    const existing = await dexieDB.orcamentos.get(budgetId);
    if (!existing) throw new Error("Orçamento não encontrado.");

    const mergedData = { ...existing.data, status, ...payload };

    if (status === 'Pendente') {
        mergedData.dataAceite = null;
        mergedData.dataRecusa = null;
        mergedData.dataConclusao = null;
    } else if (status === 'Aceito') {
        mergedData.dataRecusa = null;
        mergedData.dataConclusao = null;
    } else if (status === 'Recusado') {
        mergedData.dataAceite = null;
        mergedData.dataConclusao = null;
    }
    
    const clienteSource = (mergedData.cliente && typeof mergedData.cliente === 'object' && Object.keys(mergedData.cliente).length > 0)
        ? mergedData.cliente
        : mergedData;
    const finalCliente = getCleanedCliente(clienteSource, existing.data.userId);

    // Reconstruct to ensure clean data
    const finalData: Orcamento = {
        id: budgetId,
        userId: existing.data.userId,
        numeroOrcamento: mergedData.numeroOrcamento,
        cliente: finalCliente,
        itens: mergedData.itens,
        totalVenda: mergedData.totalVenda,
        dataCriacao: mergedData.dataCriacao,
        status: mergedData.status,
        validadeDias: mergedData.validadeDias,
        observacoes: mergedData.observacoes || '',
        observacoesInternas: mergedData.observacoesInternas || '',
        dataAceite: mergedData.dataAceite,
        dataRecusa: mergedData.dataRecusa,
        dataConclusao: mergedData.dataConclusao,
        notificacaoVencimentoEnviada: mergedData.notificacaoVencimentoEnviada,
    };

    await dexieDB.orcamentos.put({
        ...existing,
        data: finalData,
        syncStatus: 'pending',
    });
  } catch (error: any) {
    console.error("Erro em updateOrcamentoStatus:", error);
    throw new Error(error.message || "Falha ao atualizar o status do orçamento.");
  }
};


export const deleteOrcamento = async (orcamentoId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado.");

  await dexieDB.orcamentos.delete(orcamentoId);
  await dexieDB.deletions.put({ 
      id: orcamentoId, 
      userId: user.uid, 
      collection: 'orcamentos', 
      deletedAt: new Date() 
  });
};


// --- Funções para sincronização com Firestore ---

export const syncOrcamentoToFirestore = async (orcamentoData: Orcamento) => {
  const orcamentoDocRef = doc(firestoreDB, 'orcamentos', orcamentoData.id);
  // Limpeza de valores undefined antes de enviar para o Firestore
  const cleanData = JSON.parse(JSON.stringify(orcamentoData, (key, value) => 
    (value === undefined ? null : value)
  ));
  await setDoc(orcamentoDocRef, cleanData, { merge: true });
};

export const deleteOrcamentoFromFirestore = async (orcamentoId: string) => {
  const orcamentoDocRef = doc(firestoreDB, 'orcamentos', orcamentoId);
  await deleteDocFirestore(orcamentoDocRef);
};
