
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
  const existing = await dexieDB.orcamentos.get(orcamentoId);
  if (!existing) throw new Error("Orçamento não encontrado para atualização.");
  
  const { id, ...restOfBudget } = orcamento;

  const updatedData = { ...existing.data, ...restOfBudget };
  
  // Garante que campos opcionais não sejam undefined
  if (updatedData.cliente) {
    updatedData.cliente.cpfCnpj = updatedData.cliente.cpfCnpj || '';
    updatedData.cliente.email = updatedData.cliente.email || '';
    updatedData.cliente.endereco = updatedData.cliente.endereco || '';
  }
  updatedData.observacoes = updatedData.observacoes || '';
  updatedData.observacoesInternas = updatedData.observacoesInternas || '';


  await dexieDB.orcamentos.put({
    ...existing,
    data: updatedData,
    syncStatus: 'pending',
  });
};

export const updateOrcamentoStatus = async (
  budgetId: string,
  status: Orcamento['status'],
  payload: object
) => {
    const existing = await dexieDB.orcamentos.get(budgetId);
    if (!existing) throw new Error("Orçamento não encontrado.");

    const updatedData = { ...existing.data, status, ...payload };

    if (status === 'Pendente') {
        updatedData.dataAceite = null;
        updatedData.dataRecusa = null;
        updatedData.dataConclusao = null;
    } else if (status === 'Aceito') {
        updatedData.dataRecusa = null;
        updatedData.dataConclusao = null;
    } else if (status === 'Recusado') {
        updatedData.dataAceite = null;
        updatedData.dataConclusao = null;
    }


    await dexieDB.orcamentos.put({
        ...existing,
        data: updatedData,
        syncStatus: 'pending',
    });
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
