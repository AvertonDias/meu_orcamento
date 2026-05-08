
'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
} from 'react';

import type { ClienteData, Orcamento, Telefone, MaterialItem } from '@/lib/types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { PwaInstallButton } from '@/components/pwa-install-button';

import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

import {
  addOrcamento,
  deleteOrcamento,
  getNextOrcamentoNumber,
  updateOrcamento,
  updateOrcamentoStatus,
} from '@/services/orcamentosService';
import { updateEstoque } from '@/services/materiaisService';
import { addCliente } from '@/services/clientesService';

import { useSearchParams, useRouter } from 'next/navigation';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';

import { BudgetHeader } from './_components/budget-header';
import { BudgetList } from './_components/budget-list';
import { BudgetWizard } from './_components/budget-wizard';
import { BudgetEditDialog } from './_components/budget-edit-dialog';
import { BudgetPDFs } from './_components/budget-pdfs';
import { SyncStatusIndicator } from './_components/sync-status-indicator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatCurrency, formatNumber, getCleanedCliente } from '@/lib/utils';
import { BudgetDetailsModal } from './_components/budget-details-modal';
import { StatusUpdateDialog } from './_components/status-update-dialog';
import { PixModal } from './_components/pix-modal';


export default function OrcamentoPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clienteIdParam = searchParams.get('clienteId');

  // =========================
  // DADOS OFFLINE (DEXIE)
  // =========================
  const materiais = useLiveQuery(
    () => {
      if (!user?.uid) return [];
      return db.materiais
            .where('userId')
            .equals(user.uid)
            .sortBy('data.descricao');
    },
    [user?.uid]
  )?.map(m => m.data);

  const clientes = useLiveQuery(
    () => {
      if (!user?.uid) return [];
      return db.clientes
        .where('userId')
        .equals(user.uid)
        .sortBy('data.nome');
    },
    [user?.uid]
  )?.map(c => c.data);

  const orcamentosSalvosRaw = useLiveQuery(
    () => {
      if (!user?.uid) return [];
      return db.orcamentos
        .where('userId')
        .equals(user.uid)
        .reverse()
        .sortBy('data.dataCriacao');
    },
    [user?.uid]
  );

  const orcamentosSalvos = useMemo(() => {
    if (!orcamentosSalvosRaw) return undefined;

    return orcamentosSalvosRaw.map(o => {
      if (!o || typeof o.id !== 'string' || !o.id) {
        return null;
      }
    
      const data = (o.data || o) as Partial<Orcamento> & ClienteData;
      const clienteSource = (data.cliente && typeof data.cliente === 'object' && Object.keys(data.cliente).length > 0) 
          ? data.cliente 
          : data;
      const cliente = getCleanedCliente(clienteSource, o.userId);
    
      const cleanBudget: Orcamento = {
        id: o.id,
        userId: o.userId,
        numeroOrcamento: String(data.numeroOrcamento || 'N/A'),
        cliente: cliente,
        itens: Array.isArray(data.itens) ? data.itens : [],
        totalVenda: typeof data.totalVenda === 'number' ? data.totalVenda : 0,
        valorPago: typeof data.valorPago === 'number' ? data.valorPago : 0,
        dataCriacao: typeof data.dataCriacao === 'string' ? data.dataCriacao : '',
        status: data.status || 'Pendente',
        validadeDias: String(data.validadeDias || '0'),
        observacoes: String(data.observacoes || ''),
        observacoesInternas: String(data.observacoesInternas || ''),
        dataAceite: data.dataAceite ?? null,
        dataRecusa: data.dataRecusa ?? null,
        dataConclusao: data.dataConclusao ?? null,
        dataPagamento: data.dataPagamento ?? null,
        notificacaoVencimentoEnviada: !!data.notificacaoVencimentoEnviada,
      };
      return cleanBudget;
    }).filter((o): o is Orcamento => o !== null && o.dataCriacao !== '');
  }, [orcamentosSalvosRaw, user?.uid]);


  const empresaArr = useLiveQuery(
    () => {
      if (!user?.uid) return [];
      return db.empresa.where('id').equals(user.uid).toArray();
    },
    [user?.uid]
  );
  const empresa = empresaArr?.[0]?.data;

  // =========================
  // STATE UI
  // =========================
  const [clienteFiltrado, setClienteFiltrado] = useState<ClienteData | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBudget, setEditingBudget] = useState<Orcamento | null>(null);
  const [viewingBudget, setViewingBudget] = useState<Orcamento | null>(null);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [pixBudget, setPixBudget] = useState<Orcamento | null>(null);

  const [statusUpdateInfo, setStatusUpdateInfo] = useState<{
    budget: Orcamento;
    status: 'Aceito' | 'Recusado' | 'Concluído' | 'Pago';
  } | null>(null);


  const [companyPhoneDialog, setCompanyPhoneDialog] = useState<{
    open: boolean;
    phones: Telefone[];
    orcamento: Orcamento | null;
  }>({ open: false, phones: [], orcamento: null });
  const [selectedCompanyPhone, setSelectedCompanyPhone] = useState('');

  const budgetPdfRef = useRef<{
    gerarPDF: (
      orcamento: Orcamento,
      type: 'client' | 'internal'
    ) => void;
  }>(null);

  const isLoading =
    !mounted ||
    loadingAuth ||
    !materiais ||
    !clientes ||
    !orcamentosSalvos ||
    empresaArr === undefined;

  // =========================
  // FILTRO POR CLIENTE (URL)
  // =========================
  useEffect(() => {
    if (!mounted || !clienteIdParam || !clientes) {
      setClienteFiltrado(null);
      return;
    }

    const cliente = clientes.find(
      c => c.id === clienteIdParam
    );
    setClienteFiltrado(cliente || null);
  }, [clienteIdParam, clientes, mounted]);


  // =========================
  // FILTRO LISTA
  // =========================
  const filteredOrcamentos = useMemo(() => {
    if (!orcamentosSalvos) return [];

    let list = [...orcamentosSalvos];

    if (clienteIdParam) {
      list = list.filter(
        o => o.cliente.id === clienteIdParam
      );
    }
    
    if (statusFilter !== 'todos') {
      list = list.filter(o => o.status === statusFilter);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(
        o =>
          o.cliente.nome.toLowerCase().includes(s) ||
          o.numeroOrcamento?.toLowerCase().includes(s)
      );
    }

    return list;
  }, [orcamentosSalvos, searchTerm, clienteIdParam, statusFilter]);


  // =========================
  // HANDLERS
  // =========================

  const handleEditBudget = (budget: Orcamento) => {
    setViewingBudget(null);
    setEditingBudget(budget);
  };

  const openCompanyWhatsApp = (orcamento: Orcamento, phone: string) => {
    const cleanPhone = `55${phone.replace(/\D/g, '')}`;
    
    let text = `✅ ORÇAMENTO ACEITO ✅\n\n`;
    text += `*Nº:* ${orcamento.numeroOrcamento}\n`;
    text += `*Valor:* ${formatCurrency(orcamento.totalVenda)}\n\n`;

    text += "*DADOS DO CLIENTE:*\n";
    text += `*- Nome:* ${orcamento.cliente.nome}\n`;
    if (orcamento.cliente.endereco) text += `*- Endereço:* ${orcamento.cliente.endereco}\n`;
    orcamento.cliente.telefones.forEach(tel => {
        if(tel.numero) text += `*- ${tel.nome || 'Telefone'}:* ${tel.numero}\n`;
    });
    text += "\n";

    text += "*SERVIÇOS/ITENS:*\n";
    orcamento.itens.forEach(i => {
      text += `- ${i.materialNome} (${formatNumber(i.quantidade, 2)} ${i.unidade})\n`;
    });
     text += "\n";
    
    if (orcamento.observacoes) {
        text += `*Observações do Cliente:*\n${orcamento.observacoes}\n\n`;
    }
    if (orcamento.observacoesInternas) {
        text += `*Anotações Internas:*\n${orcamento.observacoesInternas}\n\n`;
    }

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleConfirmCompanyPhone = () => {
    if (companyPhoneDialog.orcamento && selectedCompanyPhone) {
      openCompanyWhatsApp(companyPhoneDialog.orcamento, selectedCompanyPhone);
    }
    setCompanyPhoneDialog({ open: false, phones: [], orcamento: null });
  };
  
  const handleSaveBudget = async (
    data: Omit<Orcamento, 'id'>,
    saveNewClient: boolean
  ) => {
    if (!user) return;
  
    let finalClientData: ClienteData = data.cliente;
  
    if (!data.cliente.id && saveNewClient) {
      const { id, userId, ...newClientPayload } = data.cliente;
      try {
        const newClientId = await addCliente(user.uid, newClientPayload);
        finalClientData = { ...newClientPayload, id: newClientId, userId: user.uid };
        toast({ title: 'Novo cliente salvo com sucesso!' });
      } catch (error) {
        console.error("Erro ao salvar novo cliente:", error);
        toast({ title: 'Erro ao salvar o novo cliente', variant: 'destructive' });
        return;
      }
    }
    
    const numero = await getNextOrcamentoNumber(user.uid);
  
    const orcamentoPayload: Omit<Orcamento, 'id'> = {
      ...data,
      userId: user.uid,
      numeroOrcamento: numero,
      cliente: { ...finalClientData, userId: user.uid }, 
    };

    await addOrcamento(orcamentoPayload);
  
    toast({ title: 'Orçamento salvo com sucesso' });
    setIsWizardOpen(false);
  };

  const handleUpdateBudget = async (budget: Orcamento) => {
    if (!user) return;

    try {
      const { id, ...data } = budget;
      await updateOrcamento(id, data);
      toast({ title: 'Orçamento atualizado com sucesso' });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar orçamento",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateStatus = async (
    budgetId: string,
    status: 'Pendente' | 'Aceito' | 'Recusado' | 'Concluído' | 'Pago'
  ) => {
    try {
      if (!user || !orcamentosSalvos) return;
  
      if (status === 'Pendente') {
        await updateOrcamentoStatus(budgetId, 'Pendente', {});
        toast({
          title: `Status alterado para: Pendente`,
        });
        return;
      }
  
      const budgetToUpdate = orcamentosSalvos.find(o => o.id === budgetId);
      if (budgetToUpdate) {
        setStatusUpdateInfo({ budget: budgetToUpdate, status });
      } else {
        throw new Error("Não foi possível localizar o orçamento.");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar atualização de status",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleSaveStatusUpdate = async (
    budgetId: string,
    status: 'Aceito' | 'Recusado' | 'Concluído' | 'Pago',
    date: Date,
    valorPagoAdicional?: number
  ) => {
    try {
      if (!user || !orcamentosSalvos) return;
      
      const budget = orcamentosSalvos.find(o => o.id === budgetId);
      if (!budget) return;

      const payload: any = {};
  
      if (status === 'Aceito') {
        payload.dataAceite = date.toISOString();
      } else if (status === 'Recusado') {
        payload.dataRecusa = date.toISOString();
      } else if (status === 'Concluído') {
        payload.dataConclusao = date.toISOString();
      } else if (status === 'Pago' && valorPagoAdicional !== undefined) {
        const novoValorPago = (budget.valorPago || 0) + valorPagoAdicional;
        payload.valorPago = novoValorPago;
        payload.dataPagamento = date.toISOString();

        // Se o valor total foi atingido, status vira "Pago". Caso contrário, mantém o status atual (Aceito/Concluído)
        if (novoValorPago >= budget.totalVenda) {
            status = 'Pago';
        } else {
            status = budget.status; // Mantém status original
        }
      }
      
      await updateOrcamentoStatus(budgetId, status, payload);
  
      if (status === 'Aceito' && budget) {
        const lowStockAlerts: string[] = [];
        for (const item of budget.itens) {
          if (!item.materialId.startsWith('avulso-')) {
            try {
              const lowStockItemName = await updateEstoque(user.uid, item.materialId, item.quantidade);
              if (lowStockItemName) {
                lowStockAlerts.push(lowStockItemName);
              }
            } catch (err) {
              console.error('Erro ao atualizar estoque:', err);
            }
          }
        }
        
        if (lowStockAlerts.length > 0) {
          toast({
            title: "Aviso de Estoque Baixo",
            description: `Os itens: ${lowStockAlerts.join(', ')} atingiram o estoque mínimo.`,
            variant: "destructive",
            duration: 7000,
          });
        }
    
        const companyPhones = empresa?.telefones?.filter(t => t.numero) ?? [];
        if (companyPhones.length === 1) {
          openCompanyWhatsApp(budget, companyPhones[0].numero);
        } else if (companyPhones.length > 1) {
          setSelectedCompanyPhone(companyPhones.find(p => p.principal)?.numero || companyPhones[0].numero);
          setCompanyPhoneDialog({ open: true, phones: companyPhones, orcamento: budget });
        }
      }
    
      toast({
        title: valorPagoAdicional !== undefined ? `Pagamento de ${formatCurrency(valorPagoAdicional)} registrado!` : `Status alterado para: ${status}`,
      });
    } catch(error: any) {
      toast({
        title: "Erro ao salvar atualização de status",
        description: error.message || "Não foi possível modificar o orçamento.",
        variant: "destructive",
      });
    }
  };


  const handleGerarPDF = (
    orc: Orcamento,
    type: 'client' | 'internal'
  ) => {
    budgetPdfRef.current?.gerarPDF(orc, type);
  };

  const handleClearFilter = () => {
    router.push('/dashboard/orcamento');
    setSearchTerm('');
    setStatusFilter('todos');
  };

  // Previne Hydration Error retornando um loader simples até que o cliente esteja pronto
  if (!mounted) {
    return (
      <div className="container mx-auto p-4 flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Meus Orçamentos</CardTitle>
              <CardDescription>
                {clienteFiltrado
                  ? `Filtrando orçamentos para ${clienteFiltrado.nome}`
                  : 'Crie e gerencie seus orçamentos, mesmo offline.'}
              </CardDescription>
            </div>
            <SyncStatusIndicator />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setIsWizardOpen(true)}
                disabled={isLoading}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Orçamento
              </Button>
              <PwaInstallButton />
            </div>
            <div className="w-full sm:w-auto sm:max-w-md flex-grow">
              <BudgetHeader
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                showClearFilter={!!clienteFiltrado || statusFilter !== 'todos'}
                onClearFilter={handleClearFilter}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <BudgetList
        isLoading={isLoading}
        budgets={filteredOrcamentos}
        empresa={empresa || null}
        onGeneratePDF={handleGerarPDF}
        onEdit={handleEditBudget}
        onDelete={deleteOrcamento}
        onUpdateStatus={handleUpdateStatus}
        clienteFiltrado={clienteFiltrado}
        onViewDetails={setViewingBudget}
        onShowPix={setPixBudget}
      />

       {clientes && materiais && (
        <BudgetWizard
          isOpen={isWizardOpen}
          onOpenChange={setIsWizardOpen}
          clientes={clientes}
          materiais={materiais}
          onSaveBudget={handleSaveBudget}
        />
      )}

      {editingBudget && materiais && (
        <BudgetEditDialog
          isOpen
          onOpenChange={open =>
            !open && setEditingBudget(null)
          }
          budget={editingBudget}
          materiais={materiais}
          onUpdateBudget={handleUpdateBudget}
        />
      )}

      {viewingBudget && (
        <BudgetDetailsModal
          budget={viewingBudget}
          isOpen={!!viewingBudget}
          onOpenChange={(open) => !open && setViewingBudget(null)}
          onEdit={handleEditBudget}
        />
      )}

      {statusUpdateInfo && (
        <StatusUpdateDialog
          updateInfo={statusUpdateInfo}
          isOpen={!!statusUpdateInfo}
          onOpenChange={(open) => !open && setStatusUpdateInfo(null)}
          onSave={handleSaveStatusUpdate}
        />
      )}

      <PixModal
        isOpen={!!pixBudget}
        onOpenChange={(open) => !open && setPixBudget(null)}
        orcamento={pixBudget}
        empresa={empresa || null}
      />

      <BudgetPDFs
        ref={budgetPdfRef}
        empresa={empresa || null}
      />

      <Dialog open={companyPhoneDialog.open} onOpenChange={(o) => setCompanyPhoneDialog(p => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notificar Empresa</DialogTitle>
            <DialogDescription>Para qual número da sua empresa deseja enviar a notificação de orçamento aceito?</DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedCompanyPhone} onValueChange={setSelectedCompanyPhone} className="space-y-3 my-4">
            {companyPhoneDialog.phones.map((p, i) => (
              <div key={i} className="flex items-center gap-3 border p-3 rounded-md">
                <RadioGroupItem value={p.numero} id={`company-phone-${i}`} />
                <Label htmlFor={`company-phone-${i}`} className="flex flex-col cursor-pointer">
                  <span className="font-semibold">{p.nome || `Telefone ${i + 1}`}</span>
                  <span className="text-muted-foreground">{p.numero}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyPhoneDialog({ open: false, phones: [], orcamento: null })}>Cancelar</Button>
            <Button onClick={handleConfirmCompanyPhone}>Confirmar Envio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
