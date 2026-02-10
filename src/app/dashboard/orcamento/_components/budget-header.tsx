
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FilterX, XCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BudgetHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  showClearFilter: boolean;
  onClearFilter: () => void;
}

export function BudgetHeader({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  showClearFilter,
  onClearFilter,
}: BudgetHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      {/* Campo de busca */}
      <div className="relative flex-grow w-full">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />

        <Input
          placeholder="Pesquisar por cliente ou nº..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10"
          aria-label="Pesquisar orçamento"
        />

        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Limpar pesquisa"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchTerm('')}
          >
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Filtro de Status */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            id="status-filter"
            className="w-full sm:w-[180px]"
            aria-label="Filtrar por status"
          >
            <SelectValue placeholder="Filtrar status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Aceito">Aceito</SelectItem>
            <SelectItem value="Concluído">Concluído</SelectItem>
            <SelectItem value="Recusado">Recusado</SelectItem>
            <SelectItem value="Vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>

        {/* Limpar filtros */}
        {showClearFilter && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClearFilter}
            aria-label="Limpar filtros"
            className="sm:inline-flex"
          >
            <FilterX className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
