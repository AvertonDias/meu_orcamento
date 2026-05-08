
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Orcamento, EmpresaData, ClienteData, Telefone } from '@/lib/types';
import {
  Card, CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  MoreVertical, FileSignature, RefreshCcw, CheckCheck, QrCode, Banknote, RotateCcw,
  Building, ArrowRight
} from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type VariantProps } from 'class-variance-authority';

interface BudgetListProps {
  isLoading: boolean;
  budgets: Orcamento[];
  empresa: EmpresaData | null;
  onUpdateStatus: (
    budgetId: string,
    status: 'Pendente' | 'Aceito' | 'Recusado' | 'Concluído' | 'Pago'
  ) => Promise<void>;
  onDelete: (budgetId: string) => void;
  onEdit: (budget: Orcamento) => void;
  onViewDetails: (budget: Orcamento) => void;
  clienteFiltrado: ClienteData | null;
  onGeneratePDF: (budget: Orcamento, type: 'client' | 'internal') => void;
  onShowPix: (budget: Orcamento) => void;
  onRevertPayment: (budgetId: string) => void;
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
  onShowPix,
  onRevertPayment,
}: BudgetListProps) {

  const { toast } = useToast();
  const [selectedPhone, setSelectedPhone] = useState('');
  const [budgetToDelete, setBudgetToDelete] = useState<Orcamento | null>(null);
  const [budgetToRevertPayment, setBudgetToRevertPayment] = useState<Orcamento | null>(null);


  const [phoneDialog, setPhoneDialog] = useState<{
    open: boolean;
    phones: Telefone[];
    orcamento: Orcamento | null;
  }>({ open: false, phones: [], orcamento: null });

  const getStatusVariant = (
    status: Orcamento['status']
  ): VariantProps<typeof badgeVariants>['variant'] => {
    if (status === 'Aceito') return 'success';
    if (status === 'Concluído') return 'default';
    if (status === 'Pago') return 'success';
    if (status === 'Recusado') return 'destructive';
    if (status === 'Vencido') return 'warning';
    return 'secondary';
  };

  /* ---------------- WHATSAPP ---------------- */
  const openWhatsApp = (orcamento: Orcamento, phone: string) => {
    const cleanPhone = `55${phone.replace(/\D/g, '')}`;

    const defaultText = 'Olá {Nome do Cliente}!\n\nSegue seu orçamento {Nº do Orçamento}:\n\n{Detalhes do Orçamento}\n\nTOTAL: {Valor Total}\n\nQualquer dúvida, estou à disposição!\n\n{Nome da Empresa}';
    
    let text = empresa?.whatsappMessage || defaultText;

    const detalhes = orcamento.itens.map(item => 
      `- ${item.materialNome} (Qtd: ${formatNumber(item.quantidade, 2)} ${item.unidade})`
    ).join('\n');

    text = text.replace(/{Nome do Cliente}/g, orcamento.cliente.nome);
    text = text.replace(/{Nº do Orçamento}/g, orcamento.numeroOrcamento);
    text = text.replace(/{Detalhes do Orçamento}/g, detalhes);
    text = text.replace(/{Valor Total}/g, formatCurrency(orcamento.totalVenda));
    text = text.replace(/{Nome da Empresa}/g, empresa?.nome || 'Nossa Empresa');

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

  const handleRevertPaymentConfirm = () => {
    if (budgetToRevertPayment) {
      onRevertPayment(budgetToRevertPayment.id);
      setBudgetToRevertPayment(null);
    }
  }


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
    const isCompanyIncomplete = !empresa?.nome || !empresa?.endereco || !empresa?.telefones?.some(t => t.numero.trim());

    if (isCompanyIncomplete && !clienteFiltrado) {
      return (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <Building className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-bold">Seja bem-vindo(a)!</h3>
              <p className="text-muted-foreground">
                Para começar a criar orçamentos profissionais, precisamos primeiro dos dados da sua empresa (nome, endereço e telefone).
              </p>
            </div>
            <Button asChild size="lg" className="mt-4">
              <Link href="/dashboard/configuracoes">
                Completar Dados da Empresa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

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
        {budgets.map(o => {
          const valorPago = o.valorPago || 0;
          const quitado = valorPago >= o.totalVenda;
          const parcial = valorPago > 0 && !quitado;
          const dataCriacao = parseISO(o.dataCriacao);
          const dataVencimento = addDays(dataCriacao, Number(o.validadeDias) || 0);

          return (
            <Card
              key={o.id}
              className="hover:border-primary/50 transition-colors relative overflow-hidden"
            >
              {quitado && (
                <div className="absolute top-0 right-0 p-1 pr-10 z-0 pointer-events-none">
                    <Badge 
                      variant="success" 
                      className="opacity-20 dark:opacity-50 transform rotate-12 text-xl py-0 px-2 font-black border-2 border-green-600 dark:text-white dark:border-white dark:bg-transparent"
                    >
                      PAGO
                    </Badge>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 z-10"
                    onClick={e => e.stopPropagation()}
                    aria-label="Ações do orçamento"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onEdit(o)} disabled={['Concluído', 'Pago'].includes(o.status)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Editar</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => sendWhatsApp(o)}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Enviar WhatsApp
                  </DropdownMenuItem>

                  {['Aceito', 'Concluído', 'Pago'].includes(o.status) && (
                    <DropdownMenuItem onClick={() => onShowPix(o)}>
                      <QrCode className="mr-2 h-4 w-4" /> Ver Pix
                    </DropdownMenuItem>
                  )}

                  {valorPago > 0 && (
                    <DropdownMenuItem onClick={() => setBudgetToRevertPayment(o)} className="text-amber-600">
                      <RotateCcw className="mr-2 h-4 w-4" /> Zerar Pagamentos
                    </DropdownMenuItem>
                  )}

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
                        <DropdownMenuItem onClick={() => onUpdateStatus(o.id, 'Concluído')}>
                          <CheckCheck className="mr-2 h-4 w-4 text-primary" /> Marcar como Concluído
                        </DropdownMenuItem>
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
                    <Badge variant={getStatusVariant(o.status)}>{o.status === 'Pago' ? 'Concluído' : o.status}</Badge>
                    {parcial && (
                      <Badge variant="outline" className="border-blue-500 text-blue-500 animate-pulse">
                        PAGO {Math.round((valorPago / o.totalVenda) * 100)}%
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                     <p className="text-sm text-muted-foreground">Nº {o.numeroOrcamento}</p>
                     {['Aceito', 'Concluído', 'Pago'].includes(o.status) && (
                        <div className="flex gap-2">
                          {!quitado && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 border-green-600/30 text-green-600 hover:bg-green-600/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(o.id, 'Pago');
                                  }}
                                >
                                  <Banknote className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Confirmar Recebimento</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 border-primary/30 text-primary hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShowPix(o);
                                }}
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gerar QR Code Pix</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                     )}
                  </div>
                </div>
                
                <div className="flex items-end justify-between mt-2">
                  <div className="flex flex-col text-sm text-muted-foreground">
                      <span>Criação: {format(dataCriacao, 'dd/MM/yy')}</span>
                      <span>Vencimento: {format(dataVencimento, 'dd/MM/yy')}</span>
                      {valorPago > 0 && (
                        <span className="text-green-600 font-medium">
                          Recebido: {formatCurrency(valorPago)}
                        </span>
                      )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <AdjustmentBadge orcamento={o} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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

      <AlertDialog open={!!budgetToRevertPayment} onOpenChange={() => setBudgetToRevertPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zerar pagamentos?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá o registro de todos os valores já recebidos para este orçamento (Nº {budgetToRevertPayment?.numeroOrcamento}). O saldo voltará ao valor total.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevertPaymentConfirm} className="bg-amber-600 hover:bg-amber-700">
              Confirmar Estorno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
