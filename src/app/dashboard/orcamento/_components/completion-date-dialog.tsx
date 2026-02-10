'use client';

import React, { useState, useEffect } from 'react';
import type { Orcamento } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Calendar } from '@/components/ui/calendar';
import { parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompletionDateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Orcamento | null;
  onSave: (budgetId: string, completionDate: Date) => Promise<void>;
}

export function CompletionDateDialog({ isOpen, onOpenChange, budget, onSave }: CompletionDateDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (budget?.dataConclusao) {
      setSelectedDate(parseISO(budget.dataConclusao));
    } else {
      setSelectedDate(new Date());
    }
  }, [budget]);

  const handleSave = async () => {
    if (!budget || !selectedDate) {
      toast({ title: 'Data inválida', description: 'Por favor, selecione uma data de conclusão.', variant: 'destructive' });
      return;
    }

    const dataCriacao = parseISO(budget.dataCriacao);
    if (selectedDate < dataCriacao) {
      toast({ title: 'Data inválida', description: 'A data de conclusão não pode ser anterior à data de criação do orçamento.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(budget.id, selectedDate);
      toast({ title: 'Orçamento marcado como concluído!' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!budget) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        onPointerDownOutside={(e) => {
            if (Capacitor.isNativePlatform()) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Marcar Orçamento como Concluído</DialogTitle>
          <DialogDescription>
            Selecione a data em que o serviço para o orçamento Nº {budget.numeroOrcamento} foi concluído.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            initialFocus
            locale={ptBR}
            disabled={(date) => date > new Date()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || !selectedDate}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar e Concluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
