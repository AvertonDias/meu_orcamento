
'use client';

import React from 'react';
import type { Orcamento } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge, badgeVariants } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, parseISO, addDays } from 'date-fns';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';
import { Capacitor } from '@capacitor/core';
import { Separator } from '@/components/ui/separator';
import { Pencil, User, Calendar, Info, Banknote, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Orcamento;
  onEdit: (budget: Orcamento) => void;
}

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

export function BudgetDetailsModal({
  isOpen,
  onOpenChange,
  budget,
  onEdit,
}: BudgetDetailsModalProps) {
  const dataCriacao = parseISO(budget.dataCriacao);
  const dataValidade = addDays(dataCriacao, Number(budget.validadeDias));
  const subtotal = budget.itens.reduce((acc, item) => acc + item.precoVenda, 0);
  const totalEditado = Math.abs(subtotal - budget.totalVenda) > 0.01;
  const ajuste = budget.totalVenda - subtotal;

  const dataAceite = budget.dataAceite ? parseISO(budget.dataAceite) : null;
  const dataRecusa = budget.dataRecusa ? parseISO(budget.dataRecusa) : null;
  const dataConclusao = budget.dataConclusao ? parseISO(budget.dataConclusao) : null;
  const dataPagamento = budget.dataPagamento ? parseISO(budget.dataPagamento) : null;

  const valorPago = budget.valorPago || 0;
  const quitado = valorPago >= budget.totalVenda;
  const saldoDevedor = budget.totalVenda - valorPago;

  const handleEditClick = () => {
    onOpenChange(false);
    onEdit(budget);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden"
        onPointerDownOutside={e => {
          if (Capacitor.isNativePlatform()) e.preventDefault();
        }}
      >
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div className="space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-bold">
                Orçamento Nº {budget.numeroOrcamento}
              </DialogTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={getStatusVariant(budget.status)} className="text-sm">
                  {budget.status}
                </Badge>
                {quitado ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> QUITADO
                  </Badge>
                ) : valorPago > 0 ? (
                  <Badge variant="outline" className="border-blue-500 text-blue-500 gap-1">
                    <Banknote className="h-3 w-3" /> PAGO PARCIAL ({Math.round((valorPago / budget.totalVenda) * 100)}%)
                  </Badge>
                ) : null}
              </div>
            </div>
            {!quitado && budget.status !== 'Recusado' && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleEditClick}
                className="shrink-0 h-10 w-10 border-primary text-primary hover:bg-primary hover:text-white"
              >
                < Pencil className="h-5 w-5" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          {/* Card de Informações do Cliente e Datas */}
          <div className="bg-muted/30 border rounded-xl p-4 space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</p>
                <p className="font-semibold text-lg leading-tight">{budget.cliente.nome}</p>
              </div>
            </div>
            
            <Separator className="bg-border/50" />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Criação</p>
                  <p className="font-medium">{format(dataCriacao, 'dd/MM/yyyy')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Validade</p>
                  <p className="font-medium text-orange-600 dark:text-orange-400">
                    {format(dataValidade, 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {(dataAceite || dataConclusao || dataRecusa || dataPagamento) && (
              <>
                <Separator className="bg-border/50" />
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {dataAceite && (
                      <p className="text-sm font-semibold text-green-600">
                        Aceito em: {format(dataAceite, 'dd/MM/yyyy')}
                      </p>
                    )}
                    {dataConclusao && (
                      <p className="text-sm font-semibold text-primary">
                        Concluído em: {format(dataConclusao, 'dd/MM/yyyy')}
                      </p>
                    )}
                    {dataPagamento && (
                      <p className={cn(
                        "text-sm font-bold px-2 py-0.5 rounded border inline-block",
                        quitado ? "text-green-700 bg-green-50 border-green-200" : "text-blue-700 bg-blue-50 border-blue-200"
                      )}>
                        {quitado ? 'Quitado em: ' : 'Última entrada: '} {format(dataPagamento, 'dd/MM/yyyy')}
                      </p>
                    )}
                    {dataRecusa && budget.status === 'Recusado' && (
                      <p className="text-sm font-semibold text-destructive">
                        Recusado em: {format(dataRecusa, 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Seção de Financeiro (Saldo) */}
          {valorPago > 0 && (
             <div className="bg-card border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Banknote className="h-4 w-4" /> Situação Financeira
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Já Recebido</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(valorPago)}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Saldo Restante</p>
                        <p className={cn("text-lg font-bold", quitado ? "text-muted-foreground" : "text-destructive")}>
                            {quitado ? "R$ 0,00" : formatCurrency(saldoDevedor)}
                        </p>
                    </div>
                </div>
                {!quitado && (
                   <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                            className="bg-green-500 h-2 rounded-full transition-all" 
                            style={{ width: `${(valorPago / budget.totalVenda) * 100}%` }}
                        />
                   </div>
                )}
             </div>
          )}

          {/* Seção de Itens e Serviços */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              Itens e Serviços
              <Badge variant="secondary" className="font-normal">{budget.itens.length}</Badge>
            </h3>
            
            {/* Versão MOBILE (Cards) */}
            <div className="md:hidden space-y-3">
              {budget.itens.map(item => (
                <div key={item.id} className="border rounded-xl p-4 bg-card shadow-sm space-y-2">
                  <p className="font-semibold text-primary text-sm sm:text-base">{item.materialNome}</p>
                  <div className="flex justify-between items-end">
                    <div className="text-sm text-muted-foreground">
                      <span>{formatNumber(item.quantidade, 2)} {item.unidade}</span>
                      <span className="mx-2">×</span>
                      <span>{formatCurrency(item.precoVenda / item.quantidade)}</span>
                    </div>
                    <p className="font-bold text-base">{formatCurrency(item.precoVenda)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Versão DESKTOP (Tabela) */}
            <div className="hidden md:block border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">Descrição</TableHead>
                    <TableHead className="text-right font-bold">Qtd.</TableHead>
                    <TableHead className="text-right font-bold">Vl. Unit.</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budget.itens.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[300px]">
                        {item.materialNome}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatNumber(item.quantidade, 2)} {item.unidade}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(item.precoVenda / item.quantidade)}
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(item.precoVenda)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Resumo de Valores */}
            <div className="bg-muted/20 border rounded-xl p-4 space-y-2">
              {totalEditado && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className={cn(
                    "flex justify-between text-sm",
                    ajuste > 0 ? "text-green-600" : "text-destructive"
                  )}>
                    <span>{ajuste > 0 ? 'Acréscimo' : 'Desconto'}</span>
                    <span>{formatCurrency(ajuste)}</span>
                  </div>
                  <Separator className="my-2" />
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">TOTAL</span>
                <span className="text-2xl font-black text-primary">
                  {formatCurrency(budget.totalVenda)}
                </span>
              </div>
            </div>
          </div>

          {/* Observações */}
          {(budget.observacoes || budget.observacoesInternas) && (
            <div className="space-y-4 pt-2">
              {budget.observacoes && (
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-tight">
                    Observações para o Cliente
                  </h4>
                  <div className="text-sm bg-muted/40 p-3 rounded-lg border italic text-foreground/80 whitespace-pre-wrap">
                    {budget.observacoes}
                  </div>
                </div>
              )}
              {budget.observacoesInternas && (
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Anotações Internas (Confidencial)
                  </h4>
                  <div className="text-sm bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 text-foreground/80 whitespace-pre-wrap">
                    {budget.observacoesInternas}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Ícone de cadeado para as anotações internas
function Lock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
