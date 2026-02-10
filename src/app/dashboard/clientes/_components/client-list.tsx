
'use client';

import React, { memo, useMemo } from 'react';
import type { ClienteData } from '@/lib/types';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { Badge, badgeVariants } from '@/components/ui/badge';
import { MoreVertical, Pencil, History, Trash2 } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { maskTelefone } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* TIPOS                                                                       */
/* -------------------------------------------------------------------------- */

export type OrcamentoStatus = 'Pendente' | 'Aceito' | 'Recusado' | 'Vencido' | 'Concluído';

export interface BudgetCounts {
  Pendente: number;
  Aceito: number;
  Recusado: number;
  Vencido: number;
  Concluído: number;
  Total: number;
}

interface ClientListProps {
  clientes: ClienteData[];
  budgetCounts: Record<string, BudgetCounts>;
  onEdit: (client: ClienteData) => void;
  onDelete: (client: ClienteData) => void;
  onViewBudgets: (id: string) => void;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                     */
/* -------------------------------------------------------------------------- */

const getStatusBadgeVariant = (
  status: OrcamentoStatus
): VariantProps<typeof badgeVariants>['variant'] => {
  switch (status) {
    case 'Aceito':
      return 'success';
    case 'Concluído':
      return 'default';
    case 'Recusado':
      return 'destructive';
    case 'Vencido':
      return 'warning';
    case 'Pendente':
    default:
      return 'secondary';
  }
};

/* -------------------------------------------------------------------------- */
/* SUBCOMPONENTE: BADGES DE ORÇAMENTO                                          */
/* -------------------------------------------------------------------------- */

const BudgetBadges = memo(
  ({ counts }: { counts?: BudgetCounts }) => {
    if (!counts || counts.Total === 0) {
      return (
        <p className="text-xs text-muted-foreground mt-1">
          Nenhum orçamento
        </p>
      );
    }

    const statusOrder: OrcamentoStatus[] = [
      'Pendente',
      'Aceito',
      'Concluído',
      'Recusado',
      'Vencido',
    ];

    return (
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {statusOrder.map(
          status =>
            counts[status] > 0 && (
              <Badge
                key={status}
                variant={getStatusBadgeVariant(status)}
                className="text-xs"
              >
                {counts[status]} {status}
              </Badge>
            )
        )}
      </div>
    );
  }
);

BudgetBadges.displayName = 'BudgetBadges';

/* -------------------------------------------------------------------------- */
/* COMPONENTE PRINCIPAL                                                        */
/* -------------------------------------------------------------------------- */

function ClientList({
  clientes,
  budgetCounts,
  onEdit,
  onDelete,
  onViewBudgets,
}: ClientListProps) {
  const validClientes = useMemo(
    () => clientes.filter(c => !!c.id),
    [clientes]
  );

  return (
    <Accordion type="multiple" className="w-full">
      {validClientes.map(cliente => {
        const counts = budgetCounts[cliente.id!];

        return (
          <AccordionItem value={cliente.id!} key={cliente.id}>
            <div className="flex items-center w-full group">
              <AccordionTrigger className="flex-1 text-left py-3 px-2 rounded-t-lg cursor-pointer data-[state=open]:bg-muted/50 hover:no-underline hover:bg-muted/30 transition-colors">
                <span className="font-medium text-lg text-primary">
                  {cliente.nome}
                </span>
              </AccordionTrigger>

              <div className="flex items-center gap-2 pr-2 h-full py-3">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <span tabIndex={0}>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Ações do cliente"
                        className="h-8 w-8"
                        onClick={e => e.stopPropagation()}
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </span>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    onClick={e => e.stopPropagation()}
                  >
                    <DropdownMenuItem onClick={() => onEdit(cliente)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar Cliente
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => onViewBudgets(cliente.id!)}
                    >
                      <History className="mr-2 h-4 w-4" />
                      Ver Orçamentos
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={() => onDelete(cliente)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir Cliente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {counts?.Total > 0 && (
                  <Badge
                    className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                    aria-label={`Total de orçamentos: ${counts.Total}`}
                  >
                    {counts.Total}
                  </Badge>
                )}
              </div>
            </div>

            <AccordionContent className="p-4 space-y-3">
              {cliente.cpfCnpj && (
                <p className="text-sm">
                  <span className="font-medium text-muted-foreground">
                    CPF/CNPJ:
                  </span>{' '}
                  {cliente.cpfCnpj}
                </p>
              )}

              {cliente.telefones?.map((tel, index) => (
                <p
                  key={`${cliente.id}-tel-${index}`}
                  className="text-sm"
                >
                  <span className="font-medium text-muted-foreground">
                    {tel.nome || `Telefone ${index + 1}`}:
                  </span>{' '}
                  {maskTelefone(tel.numero)}
                </p>
              ))}

              {cliente.email && (
                <p className="text-sm">
                  <span className="font-medium text-muted-foreground">
                    Email:
                  </span>{' '}
                  {cliente.email}
                </p>
              )}

              {cliente.endereco && (
                <p className="text-sm">
                  <span className="font-medium text-muted-foreground">
                    Endereço:
                  </span>{' '}
                  {cliente.endereco}
                </p>
              )}

              <div className="pt-2">
                <button
                  className="text-sm font-medium text-muted-foreground mb-2 hover:text-primary transition-colors"
                  onClick={() => onViewBudgets(cliente.id!)}
                >
                  Histórico de Orçamentos
                </button>

                <BudgetBadges counts={counts} />
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export default memo(ClientList);
