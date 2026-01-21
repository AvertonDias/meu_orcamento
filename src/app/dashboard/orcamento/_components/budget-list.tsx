
'use client';

import React, { useState } from 'react';
import type { Orcamento, EmpresaData, ClienteData, Telefone } from '@/lib/types';
import {
  Card, CardContent
} from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge, badgeVariants } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuPortal, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Pencil, MessageCircle,
  CheckCircle2, XCircle, Trash2,
  MoreVertical, FileSignature, RefreshCcw
} from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

interface BudgetListProps {
  isLoading: boolean;
  budgets: Orcamento[];
  empresa: EmpresaData | null;
  onUpdateStatus: (
    budgetId: string,
    status: 'Pendente' | 'Aceito' | 'Recusado'
  ) => Promise<void>;
  onDelete: (budgetId: string) => void;
  onEdit: (budget: Orcamento) => void;
  onViewDetails: (budget: Orcamento) => void;
  clienteFiltrado: ClienteData | null;
  onGeneratePDF: (budget: Orcamento, type: 'client' | 'internal') => void;
}

/* ---------------- BADGE DE AJUSTE ---------------- */
const AdjustmentBadge = ({ orcamento }: { orcamento: Orcamento }) => {
  const calculated = orcamento.itens.reduce((s, i) => s + i.precoVenda, 0);
  const isAdjusted = Math.abs(calculated - orcamento.totalVenda) > 0.01;

  if (!isAdjusted) {
    return (
      <div className="flex flex-col items-end">
        <span className="font-bold">{formatCurrency(orcamento.totalVenda)}</span>
      </div>
    );
  }

  const diff = orcamento.totalVenda - calculated;
  const percentage = calculated !== 0 ? (diff / calculated) * 100 : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <div className="flex flex-col items-end">
              <span className="font-bold">{formatCurrency(orcamento.totalVenda)}</span>
              <span
                className={cn(
                  'text-xs',
                  diff < 0 ? 'text-destructive' : 'text-green-600'
                )}
              >
                {diff > 0 ? 'Acréscimo' : 'Desconto'} ({percentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Total calculado: {formatCurrency(calculated)}</p>
          <p>Ajuste manual: {formatCurrency(diff)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


/* ---------------- COMPONENTE PRINCIPAL ---------------- */
export function BudgetList({
  isLoading,
  budgets,
  empresa,
  onUpdateStatus,
  onDelete,
  onEdit,
  onViewDetails,
  clienteFiltrado,
  onGeneratePDF,
}: BudgetListProps) {

  const { toast } = useToast();
  const [selectedPhone, setSelectedPhone] = useState('');
  const [budgetToDelete, setBudgetToDelete] = useState<Orcamento | null>(null);


  const [phoneDialog, setPhoneDialog] = useState<{
    open: boolean;
    phones: Telefone[];
    orcamento: Orcamento | null;
  }>({ open: false, phones: [], orcamento: null });

  const getStatusVariant = (
    status: Orcamento['status']
  ): VariantProps<typeof badgeVariants>['variant'] => {
    if (status === 'Aceito') return 'default';
    if (status === 'Recusado') return 'destructive';
    if (status === 'Vencido') return 'warning';
    return 'secondary';
  };

  /* ---------------- WHATSAPP ---------------- */
  const openWhatsApp = (orcamento: Orcamento, phone: string) => {
    const cleanPhone = `55${phone.replace(/\D/g, '')}`;

    // Mensagem Padrão
    let defaultText = 'Olá *{cliente.nome}*!\n\nSegue seu orçamento {orcamento.numero}:\n\n{orcamento.detalhes}\n\n*TOTAL:* {orcamento.total}\n\nQualquer dúvida, estou à disposição!\n\n*{empresa.nome}*';
    
    // Usa a mensagem customizada se existir, senão a padrão
    let text = empresa?.whatsappMessage || defaultText;

    // Gera os detalhes do orçamento
    const detalhes = orcamento.itens.map(item => 
      `- ${item.materialNome} (Qtd: ${formatNumber(item.quantidade, 2)} ${item.unidade})`
    ).join('\n');

    // Substitui as variáveis
    text = text.replace(/{cliente.nome}/g, orcamento.cliente.nome);
    text = text.replace(/{orcamento.numero}/g, orcamento.numeroOrcamento);
    text = text.replace(/{orcamento.total}/g, formatCurrency(orcamento.totalVenda));
    text = text.replace(/{orcamento.detalhes}/g, detalhes);
    text = text.replace(/{empresa.nome}/g, empresa?.nome || 'Nossa Empresa');


    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };
  
  const sendWhatsApp = (orcamento: Orcamento) => {
    const phones = orcamento.cliente.telefones?.filter(t => t.numero) ?? [];

    if (phones.length === 0) {
      toast({ title: 'Cliente sem telefone cadastrado.', variant: 'destructive' });
      return;
    }

    if (phones.length > 1) {
      setSelectedPhone(phones.find(p => p.principal)?.numero ?? phones[0].numero);
      setPhoneDialog({
        open: true,
        phones,
        orcamento: orcamento,
      });
    } else {
      openWhatsApp(orcamento, phones[0].numero);
    }
  };

  const handleConfirmPhone = () => {
      if (phoneDialog.orcamento && selectedPhone) {
          openWhatsApp(phoneDialog.orcamento, selectedPhone);
      }
      setPhoneDialog({ open: false, phones: [], orcamento: null });
  }


  const handleDeleteConfirm = () => {
    if (budgetToDelete) {
      onDelete(budgetToDelete.id);
      setBudgetToDelete(null);
    }
  };


  /* ---------------- LOADING ---------------- */
  if (isLoading) {
    return (
      <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  /* ---------------- EMPTY ---------------- */
  if (!budgets.length) {
    return (
      <Card>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            {clienteFiltrado
              ? `Nenhum orçamento encontrado para ${clienteFiltrado.nome}.`
              : 'Nenhum orçamento encontrado.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ---------------- RENDER ---------------- */
  return (
    <>
      {/* Dialog telefone */}
      <Dialog open={phoneDialog.open} onOpenChange={(o) => setPhoneDialog(p => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha o telefone</DialogTitle>
            <DialogDescription>O cliente possui múltiplos números. Selecione para qual deseja enviar.</DialogDescription>
          </DialogHeader>

          <RadioGroup value={selectedPhone} onValueChange={setSelectedPhone} className="space-y-3 my-4">
            {phoneDialog.phones.map((p, i) => (
              <div key={i} className="flex items-center gap-3 border p-3 rounded-md">
                <RadioGroupItem value={p.numero} id={`phone-${i}`} />
                <Label htmlFor={`phone-${i}`} className="flex flex-col cursor-pointer">
                  <span className="font-semibold">{p.nome || `Telefone ${i + 1}`}</span>
                  <span className="text-muted-foreground">{p.numero}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneDialog({ open: false, phones: [], orcamento: null })}>Cancelar</Button>
            <Button onClick={handleConfirmPhone}>Confirmar Envio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {budgets.map(o => (
          <Card
            key={o.id}
            className="hover:border-primary/50 transition-colors relative"
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'absolute top-2 right-2 h-8 w-8'
                )}
                onClick={e => e.stopPropagation()}
                aria-label="Ações do orçamento"
              >
                <MoreVertical className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onEdit(o)} disabled={o.status === 'Aceito'}>
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Editar</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => sendWhatsApp(o)}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Enviar WhatsApp
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger><FileText className="mr-2 h-4 w-4" /> Gerar PDF</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => onGeneratePDF(o, 'client')}>PDF do Cliente</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onGeneratePDF(o, 'internal')}>PDF Interno (custos)</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger><FileSignature className="mr-2 h-4 w-4" /> Alterar Status</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => onUpdateStatus(o.id, 'Aceito')}>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Marcar como Aceito
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(o.id, 'Recusado')}>
                        <XCircle className="mr-2 h-4 w-4 text-red-500" /> Marcar como Recusado
                      </DropdownMenuItem>
                       {o.status !== 'Pendente' && <DropdownMenuSeparator />}
                       {o.status !== 'Pendente' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus(o.id, 'Pendente')}>
                            <RefreshCcw className="mr-2 h-4 w-4" /> Reverter para Pendente
                          </DropdownMenuItem>
                       )}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setBudgetToDelete(o)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <CardContent className="p-4 cursor-pointer flex flex-col justify-between min-h-[110px]" onClick={() => onViewDetails(o)}>
              <div className="flex-1 space-y-1 pr-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-primary truncate" title={o.cliente.nome}>{o.cliente.nome}</h3>
                  <Badge variant={getStatusVariant(o.status)}>{o.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Nº {o.numeroOrcamento}</p>
              </div>
              
              <div className="flex items-end justify-between mt-2">
                <div className="flex flex-col text-sm text-muted-foreground">
                    <span>Criação: {format(parseISO(o.dataCriacao), 'dd/MM/yy')}</span>
                    <span>Venc.: {format(addDays(parseISO(o.dataCriacao), Number(o.validadeDias)), 'dd/MM/yy')}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <AdjustmentBadge orcamento={o} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!budgetToDelete} onOpenChange={() => setBudgetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita e irá remover o orçamento nº {budgetToDelete?.numeroOrcamento} permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
