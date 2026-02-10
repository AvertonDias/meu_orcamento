
import { v4 as uuidv4 } from 'uuid';

export interface EmpresaData {
  id: string; // Firestore document ID
  userId: string;
  nome: string;
  endereco: string;
  telefones: Telefone[];
  cnpj: string;
  logo?: string;
  fcmToken?: string; 
  whatsappMessage?: string;
}

export interface Telefone {
  nome: string;
  numero: string;
  principal?: boolean;
}

export interface ClienteData {
  id: string; // Firestore document ID
  userId: string;
  nome: string;
  endereco?: string;
  telefones: Telefone[];
  email?: string;
  cpfCnpj?: string;
}

// Tipo generalizado para itens e serviços
export interface MaterialItem {
  id: string; // Firestore document ID
  userId: string;
  descricao: string; // O nome/descrição específica do item. Ex: "Troca de tomada", "Pintura de parede"
  unidade: string;     // Unidade de medida (un, h, m, m², serv, etc.)
  precoUnitario: number | null; // R$ por unidade
  tipo: 'item' | 'servico'; // Distingue entre item físico e serviço
  quantidade: number | null; // Quantidade em estoque, aplicável apenas para 'item'
  quantidadeMinima: number | null; // Quantidade mínima em estoque para alerta
}

export interface OrcamentoItem {
  id: string;
  materialId: string;
  materialNome: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  total: number; // Custo do item (quantidade * precoUnitario)
  margemLucro: number; // Acréscimo em %
  precoVenda: number; // Preço final para o cliente
}

export interface Orcamento {
  id: string; // Firestore document ID
  userId: string;
  numeroOrcamento: string;
  cliente: ClienteData;
  itens: OrcamentoItem[];
  totalVenda: number;
  dataCriacao: string; // ISO Date String
  status: 'Pendente' | 'Aceito' | 'Recusado' | 'Vencido' | 'Concluído';
  validadeDias: string;
  observacoes?: string;
  observacoesInternas?: string; // Novo campo para anotações internas
  dataAceite: string | null; // ISO Date String
  dataRecusa: string | null; // ISO Date String
  dataConclusao: string | null;
  notificacaoVencimentoEnviada?: boolean;
}

// Helper para garantir que o ID exista
export const ensureId = <T extends { id?: string }>(obj: T): T & { id: string } => {
  if (obj.id) {
    return obj as T & { id: string };
  }
  return { ...obj, id: uuidv4() };
};
