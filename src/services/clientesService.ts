
import { db as firestoreDB } from '@/lib/firebase';
import { collection, addDoc as addDocFirestore, doc, updateDoc as updateDocFirestore, deleteDoc as deleteDocFirestore, setDoc } from 'firebase/firestore';
import { db as dexieDB } from '@/lib/dexie';
import type { ClienteData } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/firebase';

// --- Funções que interagem com o Dexie (local) ---

export const addCliente = async (userId: string, cliente: Omit<ClienteData, 'id' | 'userId'>): Promise<string> => {
  const newId = uuidv4();
  const dataToSave: ClienteData = {
    ...cliente,
    id: newId,
    userId,
    // Garante que campos opcionais sejam strings vazias, e não undefined
    cpfCnpj: cliente.cpfCnpj ?? '',
    email: cliente.email ?? '',
    endereco: cliente.endereco ?? '',
  };

  await dexieDB.clientes.put({
    id: newId,
    userId: userId,
    data: dataToSave,
    syncStatus: 'pending',
  });
  
  return newId;
};

export const updateCliente = async (clienteId: string, cliente: Partial<Omit<ClienteData, 'id' | 'userId'>>) => {
    const existing = await dexieDB.clientes.get(clienteId);
    if (!existing) throw new Error("Cliente não encontrado para atualização.");

    const updatedData = { ...existing.data, ...cliente };

    await dexieDB.clientes.put({
        ...existing,
        data: updatedData,
        syncStatus: 'pending',
    });
};

export const deleteCliente = async (clienteId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");
    
    await dexieDB.clientes.delete(clienteId);
    await dexieDB.deletions.put({ 
        id: clienteId, 
        userId: user.uid, 
        collection: 'clientes', 
        deletedAt: new Date() 
    });
};


// --- Funções que interagem com o Firestore (usadas pela sincronização) ---

export const syncClienteToFirestore = async (clienteData: ClienteData) => {
    const clienteDocRef = doc(firestoreDB, 'clientes', clienteData.id);
    // `setDoc` com `merge: true` funciona como um "upsert", criando ou atualizando.
    const cleanData = JSON.parse(JSON.stringify(clienteData, (key, value) =>
      value === undefined ? null : value
    ));
    await setDoc(clienteDocRef, cleanData, { merge: true });
};

export const deleteClienteFromFirestore = async (clienteId: string) => {
    const clienteDoc = doc(firestoreDB, 'clientes', clienteId);
    await deleteDocFirestore(clienteDoc);
};
