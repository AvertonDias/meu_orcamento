
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
  TableFooter,
} from '@/components/ui/table';
import { format, parseISO, addDays } from 'date-fns';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';
import { Capacitor } from '@capacitor/core';
import { Separator } from '@/components/ui/separator';
import { Pencil } from 'lucide-react';

interface BudgetDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Orcamento;
  onEdit: (budget: Orcamento) => void;
}

const getStatusVariant = (
  status: Orcamento['status']
): VariantProps<typeof badgeVariants>['variant'] => {
  if (status === 'Aceito') return 'default';
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

  const handleEditClick = () => {
    onOpenChange(false); // fecha detalhes
    onEdit(budget);     // pede ao pai para abrir edição
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-[95vw] h-[90vh] flex flex-col p-0"
        onPointerDownOutside={e => {
          if (Capacitor.isNativePlatform()) e.preventDefault();
        }}
      >
        <DialogHeader className="p-6 pb-4 flex flex-row items-start justify-between">
          <div className="space-y-2">
            <DialogTitle className="text-2xl flex items-center gap-3">
              Orçamento Nº {budget.numeroOrcamento}
              <Badge
                variant={getStatusVariant(budget.status)}
                className="text-base"
              >
                {budget.status}
              </Badge>
            </DialogTitle>
          </div>

          {budget.status !== 'Aceito' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditClick}
              aria-label="Editar orçamento"
            >
              <Pencil className="h-5 w-5" />
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {/* Informações Gerais */}
          <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-1 text-sm p-4 border rounded-lg">
            <div className="font-medium text-muted-foreground col-span-full sm:col-span-1">
              Cliente:
            </div>
            <div className="font-semibold col-span-full sm:col-span-3">
              {budget.cliente.nome}
            </div>

            <div className="font-medium text-muted-foreground">Criação:</div>
            <div className="font-semibold">
              {format(dataCriacao, 'dd/MM/yyyy')}
            </div>

            <div className="font-medium text-muted-foreground">Validade:</div>
            <div className="font-semibold">
              {format(dataValidade, 'dd/MM/yyyy')}
            </div>
          </div>

          {/* Itens */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Itens e Serviços</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Vl. Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budget.itens.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.materialNome}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(item.quantidade, 2)} {item.unidade}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.precoVenda / item.quantidade)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.precoVenda)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  {totalEditado && [
                    <TableRow key="subtotal">
                      <TableCell colSpan={3} className="text-right">
                        Subtotal
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(subtotal)}
                      </TableCell>
                    </TableRow>,
                    <TableRow key="ajuste">
                      <TableCell colSpan={3} className="text-right">
                        {ajuste > 0 ? 'Acréscimo' : 'Desconto'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(ajuste)}
                      </TableCell>
                    </TableRow>,
                  ]}
                  <TableRow className="text-lg bg-muted/50">
                    <TableCell colSpan={3} className="text-right font-bold">
                      TOTAL
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(budget.totalVenda)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          {(budget.observacoes || budget.observacoesInternas) && <Separator />}

          <div className="space-y-4 text-sm">
            {budget.observacoes && (
              <div>
                <h4 className="font-semibold text-muted-foreground mb-1">
                  Observações (para o cliente)
                </h4>
                <p className="whitespace-pre-wrap p-3 bg-muted/50 rounded-md">
                  {budget.observacoes}
                </p>
              </div>
            )}
            {budget.observacoesInternas && (
              <div>
                <h4 className="font-semibold text-muted-foreground mb-1">
                  Anotações Internas (confidencial)
                </h4>
                <p className="whitespace-pre-wrap p-3 bg-muted/50 rounded-md">
                  {budget.observacoesInternas}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
