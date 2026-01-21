
'use client';

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import type { OrcamentoItem } from '@/lib/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  maskDecimal,
  maskInteger,
  maskCurrency,
  formatCurrency,
} from '@/lib/utils';

import { Capacitor } from '@capacitor/core';
import { Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/* =========================
   TIPOS
========================= */

interface EditItemModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: OrcamentoItem;
  onSave: (item: OrcamentoItem) => void;
}

const integerUnits = ['un', 'h', 'serv', 'dia'];

/* =========================
   COMPONENTE
========================= */

export function EditItemModal({
  isOpen,
  onOpenChange,
  item,
  onSave,
}: EditItemModalProps) {
  const [editingItem, setEditingItem] = useState<OrcamentoItem>(item);

  const [quantidadeStr, setQuantidadeStr] = useState('');
  const [margemLucroStr, setMargemLucroStr] = useState('');
  const [precoUnitarioStr, setPrecoUnitarioStr] = useState('');
  const [precoVendaStr, setPrecoVendaStr] = useState('');

  const isAvulso = useMemo(
    () => item.materialId?.startsWith('avulso-'),
    [item.materialId]
  );

  const isCurrentUnitInteger = useMemo(
    () => integerUnits.includes(editingItem.unidade),
    [editingItem.unidade]
  );

  const [isCostUnlocked, setIsCostUnlocked] = useState(isAvulso);
  const [isSalePriceUnlocked, setIsSalePriceUnlocked] = useState(false);

  // Valores Originais
  const originalCost = useMemo(() => item.precoUnitario, [item]);
  const originalSalePrice = useMemo(() => item.precoVenda, [item]);
  
  const costHasChanged = useMemo(
    () => Math.abs(editingItem.precoUnitario - originalCost) > 0.001,
    [editingItem.precoUnitario, originalCost]
  );

  const salePriceHasChanged = useMemo(
    () => Math.abs(editingItem.precoVenda - originalSalePrice) > 0.001,
    [editingItem.precoVenda, originalSalePrice]
  );


  /* =========================
     SINCRONIZA ITEM AO ABRIR
  ========================= */

  useEffect(() => {
    if (!item) return;

    setEditingItem({ ...item });

    setQuantidadeStr(String(item.quantidade).replace('.', ','));
    setMargemLucroStr(
      item.margemLucro > 0 ? String(item.margemLucro.toFixed(2)).replace('.', ',') : ''
    );
    setPrecoUnitarioStr(maskCurrency(item.precoUnitario.toFixed(2)));
    setPrecoVendaStr(maskCurrency(item.precoVenda.toFixed(2)));

    setIsCostUnlocked(item.materialId.startsWith('avulso-'));
    setIsSalePriceUnlocked(false);
  }, [item]);

  /* =========================
     HANDLER DE ALTERAÇÃO
  ========================= */

  const handleChange = (
    name:
      | 'materialNome'
      | 'quantidade'
      | 'margemLucro'
      | 'precoUnitario'
      | 'precoVenda',
    value: string
  ) => {
    let newItem = { ...editingItem };
    let newQuantidadeStr = quantidadeStr;
    let newMargemStr = margemLucroStr;
    let newPrecoUnitStr = precoUnitarioStr;
    let newPrecoVendaStr = precoVendaStr;

    // Atualiza o valor do campo que foi modificado
    switch (name) {
      case 'materialNome':
        newItem.materialNome = value;
        break;
      case 'quantidade':
        newQuantidadeStr = isCurrentUnitInteger
          ? maskInteger(value)
          : maskDecimal(value);
        break;
      case 'margemLucro':
        newMargemStr = maskDecimal(value);
        setIsSalePriceUnlocked(false); // Bloqueia o preço de venda ao mudar a margem
        break;
      case 'precoUnitario':
        newPrecoUnitStr = maskCurrency(value);
        setIsSalePriceUnlocked(false); // Bloqueia o preço de venda ao mudar o custo
        break;
      case 'precoVenda':
        newPrecoVendaStr = maskCurrency(value);
        setIsSalePriceUnlocked(true); // Desbloqueia ao editar manualmente
        break;
    }

    // Pega os valores numéricos dos campos
    const quantidade = parseFloat(newQuantidadeStr.replace(',', '.')) || 0;
    const margem = parseFloat(newMargemStr.replace(',', '.')) || 0;
    const precoUnitario =
      parseFloat(newPrecoUnitStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    const precoVenda =
      parseFloat(newPrecoVendaStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
    // Recalcula os valores dependentes
    if (isSalePriceUnlocked) {
      // Se o PREÇO DE VENDA está desbloqueado (foi alterado), recalcula o CUSTO UNITÁRIO
      const margemDecimal = 1 + (margem / 100);
      let novoCustoUnitario = 0;
      if (quantidade > 0 && margemDecimal > 0) {
        novoCustoUnitario = precoVenda / quantidade / margemDecimal;
      }
      
      newItem.precoUnitario = novoCustoUnitario;
      newPrecoUnitStr = formatCurrency(novoCustoUnitario, false);
      newItem.precoVenda = precoVenda;

    } else {
      // Se qualquer OUTRO campo foi alterado, recalcula o PREÇO DE VENDA
      newItem.total = precoUnitario * quantidade;
      newItem.precoVenda = newItem.total * (1 + margem / 100);
      newPrecoVendaStr = formatCurrency(newItem.precoVenda, false);
      newItem.precoUnitario = precoUnitario;
    }
    
    newItem.quantidade = quantidade;
    newItem.margemLucro = margem;
    

    // Atualiza todos os estados
    setEditingItem(newItem);
    setQuantidadeStr(newQuantidadeStr);
    setMargemLucroStr(newMargemStr);
    setPrecoUnitarioStr(newPrecoUnitStr);
    setPrecoVendaStr(newPrecoVendaStr);
  };

  /* =========================
     SALVAR
  ========================= */

  const handleSave = (e: FormEvent) => {
    e.preventDefault();

    if (editingItem.quantidade <= 0) {
      alert('Quantidade inválida');
      return;
    }

    onSave(editingItem);
  };

  if (!editingItem) return null;

  /* =========================
     RENDER
  ========================= */

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={e => {
          if (Capacitor.isNativePlatform()) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Editar Item do Orçamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-4">
          <div>
            <Label>Nome do Item</Label>
            <Input
              name="materialNome"
              value={editingItem.materialNome}
              onChange={e => handleChange('materialNome', e.target.value)}
              disabled={!isAvulso}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantidade ({editingItem.unidade})</Label>
              <Input
                name="quantidade"
                inputMode={isCurrentUnitInteger ? 'numeric' : 'decimal'}
                value={quantidadeStr}
                onChange={e => handleChange('quantidade', e.target.value)}
              />
            </div>
            <div>
              <Label>Acréscimo (%)</Label>
              <Input
                name="margemLucro"
                inputMode="decimal"
                value={margemLucroStr}
                onChange={e => handleChange('margemLucro', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço de Custo Unitário (R$)</Label>
              <div className="relative">
                <Input
                  name="precoUnitario"
                  value={precoUnitarioStr}
                  onChange={e => handleChange('precoUnitario', e.target.value)}
                  disabled={!isCostUnlocked}
                  className={cn(!isCostUnlocked && 'pr-10')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setIsCostUnlocked(v => !v)}
                >
                  {isCostUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
                </Button>
              </div>

              {costHasChanged && (
                 <p className="text-xs text-muted-foreground mt-1">
                  Custo original: {formatCurrency(originalCost)}
                </p>
              )}
            </div>

            <div>
              <Label>Preço Final de Venda (R$)</Label>
               <div className="relative">
                <Input
                  name="precoVenda"
                  value={precoVendaStr}
                  onChange={e => handleChange('precoVenda', e.target.value)}
                  disabled={!isSalePriceUnlocked}
                  className={cn(!isSalePriceUnlocked && 'pr-10')}
                />
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setIsSalePriceUnlocked(v => !v)}
                  >
                    {isSalePriceUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
                  </Button>
               </div>
               {salePriceHasChanged && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Venda original: {formatCurrency(originalSalePrice)}
                  </p>
               )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
