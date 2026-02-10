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

interface StatusUpdateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  updateInfo: { budget: Orcamento; status: 'Aceito' | 'Recusado' | 'Concluído' } | null;
  onSave: (budgetId: string, status: 'Aceito' | 'Recusado' | 'Concluído', date: Date) => Promise<void>;
}

const statusConfig = {
  Aceito: {
    title: 'Marcar Orçamento como Aceito',
    description: 'Selecione a data em que o orçamento foi aceito pelo cliente.',
    dateField: 'dataAceite',
  },
  Recusado: {
    title: 'Marcar Orçamento como Recusado',
    description: 'Selecione a data em que o orçamento foi recusado.',
    dateField: 'dataRecusa',
  },
  Concluído: {
    title: 'Marcar Orçamento como Concluído',
    description: 'Selecione a data em que o serviço foi concluído.',
    dateField: 'dataConclusao',
  },
};


export function StatusUpdateDialog({ isOpen, onOpenChange, updateInfo, onSave }: StatusUpdateDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const config = updateInfo ? statusConfig[updateInfo.status] : null;

  useEffect(() => {
    if (updateInfo?.budget && config) {
      const budgetDateField = updateInfo.budget[config.dateField as keyof Orcamento];
      if (budgetDateField && typeof budgetDateField === 'string') {
        setSelectedDate(parseISO(budgetDateField));
      } else {
        setSelectedDate(new Date());
      }
    } else {
      setSelectedDate(new Date());
    }
  }, [updateInfo, config]);

  const handleSave = async () => {
    if (!updateInfo || !selectedDate) {
      toast({ title: 'Data inválida', description: 'Por favor, selecione uma data.', variant: 'destructive' });
      return;
    }

    const { budget, status } = updateInfo;

    const dataCriacao = parseISO(budget.dataCriacao);
    if (selectedDate < dataCriacao) {
      toast({ title: 'Data inválida', description: 'A data selecionada não pode ser anterior à data de criação do orçamento.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(budget.id, status, selectedDate);
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!updateInfo || !config) return null;
  const { budget } = updateInfo;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        onPointerDownOutside={(e) => {
            if (Capacitor.isNativePlatform()) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            Orçamento Nº {budget.numeroOrcamento}. {config.description}
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
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
