'use client';

import React, { useState, useEffect, FormEvent } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { maskInteger } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface EditValidityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Orcamento | null;
  onSave: (budgetId: string, newValidity: string) => Promise<void>;
}

export function EditValidityDialog({ isOpen, onOpenChange, budget, onSave }: EditValidityDialogProps) {
  const [validity, setValidity] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (budget) {
      setValidity(budget.validadeDias);
    }
  }, [budget]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!budget || !validity) {
      toast({ title: 'Campo obrigatório', description: 'Informe o número de dias.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(budget.id, validity);
      toast({ title: 'Validade atualizada com sucesso!' });
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
        <form onSubmit={handleSave}>
            <DialogHeader>
            <DialogTitle>Alterar Validade do Orçamento</DialogTitle>
            <DialogDescription>
                Orçamento Nº {budget.numeroOrcamento} para {budget.cliente.nome}.
            </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
            <Label htmlFor="validade">Validade (em dias)</Label>
            <Input
                id="validade"
                value={validity}
                onChange={(e) => setValidity(maskInteger(e.target.value))}
                placeholder="Ex: 7"
                autoFocus
            />
            </div>
            <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
