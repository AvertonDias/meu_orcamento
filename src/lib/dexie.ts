import Dexie, { type EntityTable } from 'dexie';
import type { ClienteData, EmpresaData, MaterialItem, Orcamento } from './types';

// Wrapper padrão para dados offline + sync
export interface DexieWrapper<T> {
  id: string; // chave primária (mesmo ID do Firestore)
  userId: string;
  data: T;
  syncStatus: 'pending' | 'synced' | 'error';
  syncError?: string | null;
}

// Registro de exclusões para sincronização offline
export interface DeletionEntity {
  id: string; // id do documento excluído
  userId: string; // dono do dado (OBRIGATÓRIO)
  collection: 'clientes' | 'materiais' | 'orcamentos';
  deletedAt: Date;
}

export type SyncableCollection = 'clientes' | 'materiais' | 'orcamentos' | 'empresa';

class MeuOrcamentoDB extends Dexie {
  clientes!: EntityTable<DexieWrapper<ClienteData>, 'id'>;
  materiais!: EntityTable<DexieWrapper<MaterialItem>, 'id'>;
  orcamentos!: EntityTable<DexieWrapper<Orcamento>, 'id'>;
  empresa!: EntityTable<DexieWrapper<EmpresaData>, 'id'>;
  deletions!: EntityTable<DeletionEntity, 'id'>;

  constructor() {
    super('MeuOrcamentoDB');

    // 🔼 Versão incrementada por mudança de schema
    this.version(2).stores({
      clientes: 'id, userId, *data.nome, syncStatus',
      materiais: 'id, userId, *data.descricao, syncStatus',
      orcamentos:
        'id, userId, *data.numeroOrcamento, *data.cliente.nome, data.dataCriacao, syncStatus',
      empresa: 'id, userId, syncStatus',

      // ✅ userId indexado (problema resolvido)
      deletions: 'id, userId, collection, deletedAt',
    });
  }
}

export const db = new MeuOrcamentoDB();
