'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { Orcamento, EmpresaData } from '@/lib/types';
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
import { generatePixPayload, getPixQRCodeUrl } from '@/lib/pix-utils';
import { formatCurrency, maskCurrency } from '@/lib/utils';
import { Copy, Check, QrCode, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';

interface PixModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: Orcamento | null;
  empresa: EmpresaData | null;
}

export function PixModal({ isOpen, onOpenChange, orcamento, empresa }: PixModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<string>('0');
  const [editableAmountStr, setEditableAmountStr] = useState('');

  // Reseta estados ao abrir
  useEffect(() => {
    if (isOpen && orcamento && empresa) {
      const principalIndex = (empresa.chavesPix || []).findIndex(k => k.principal);
      setSelectedKeyIndex(principalIndex >= 0 ? String(principalIndex) : '0');
      
      const valorRestante = orcamento.totalVenda - (orcamento.valorPago || 0);
      setEditableAmountStr(maskCurrency(valorRestante.toFixed(2)));
    }
  }, [isOpen, orcamento, empresa]);

  const numericValue = useMemo(() => {
    return parseFloat(editableAmountStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  }, [editableAmountStr]);

  const pixData = useMemo(() => {
    if (!orcamento || !empresa || numericValue <= 0) return null;

    const keys = empresa.chavesPix || [];
    const index = parseInt(selectedKeyIndex, 10);
    const activeKey = keys[index] || keys[0];
    
    const activeChave = activeKey?.chave || empresa.chavePix;
    const activeCidade = activeKey?.cidade || empresa.pixCidade || 'CIDADE';

    if (!activeChave) return null;

    try {
      const orcNumClean = orcamento.numeroOrcamento.replace(/[^a-zA-Z0-9]/g, '');
      const orcId = `orc${orcNumClean}`;

      const payload = generatePixPayload({
        chave: activeChave,
        beneficiario: empresa.nome,
        cidade: activeCidade,
        valor: numericValue,
        identificador: orcId,
      });

      return {
        payload,
        qrCodeUrl: getPixQRCodeUrl(payload),
      };
    } catch (e) {
      console.error('Erro ao gerar payload Pix:', e);
      return null;
    }
  }, [orcamento, empresa, selectedKeyIndex, numericValue]);

  const handleCopy = () => {
    if (pixData?.payload) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pixData.payload);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = pixData.payload;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast({ title: 'Código Pix copiado!' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!orcamento) return null;

  const hasMultipleKeys = (empresa?.chavesPix?.length || 0) > 1;
  const hasPixConfig = empresa && ((empresa.chavesPix && empresa.chavesPix.some(k => k.chave.trim())) || empresa.chavePix);
  const valorRestanteReal = orcamento.totalVenda - (orcamento.valorPago || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Pagamento via Pix
          </DialogTitle>
          <DialogDescription>
            Mostre o QR Code ou copie o código. Você pode alterar o valor para pagamentos parciais.
          </DialogDescription>
        </DialogHeader>

        {!empresa || !hasPixConfig ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
            </div>
            <p className="text-sm font-medium">Chave Pix não configurada!</p>
            <p className="text-xs text-muted-foreground px-4">
              Vá em <strong>Configurações > Recebimento via Pix</strong>.
            </p>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/dashboard/configuracoes" onClick={() => onOpenChange(false)}>
                Configurar Agora
              </Link>
            </Button>
          </div>
        ) : valorRestanteReal <= 0.01 ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <Check className="h-16 w-16 text-green-500 border-4 border-green-500 rounded-full p-2" />
            </div>
            <p className="text-lg font-bold text-green-600">ORÇAMENTO QUITADO</p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-2 w-full">Fechar</Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 py-2">
            
            <div className="w-full space-y-2">
              <Label htmlFor="pix-amount" className="text-xs font-bold uppercase text-muted-foreground">Valor a Cobrar (R$)</Label>
              <Input 
                id="pix-amount"
                value={editableAmountStr}
                onChange={(e) => setEditableAmountStr(maskCurrency(e.target.value))}
                className="text-lg font-bold text-primary border-primary/50"
              />
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground">Saldo Restante: {formatCurrency(valorRestanteReal)}</span>
                <button 
                  className="text-primary underline" 
                  onClick={() => setEditableAmountStr(maskCurrency(valorRestanteReal.toFixed(2)))}
                >
                  Usar Total
                </button>
              </div>
            </div>

            {hasMultipleKeys && (
              <div className="w-full space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Chave Pix</Label>
                <Select value={selectedKeyIndex} onValueChange={setSelectedKeyIndex}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {empresa.chavesPix.map((key, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {key.chave} {key.principal ? '(Principal)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {pixData && numericValue > 0 ? (
              <>
                <div className="bg-white p-2 rounded-lg border shadow-sm">
                  <img
                    src={pixData.qrCodeUrl}
                    alt="QR Code Pix"
                    className="w-44 h-44"
                  />
                </div>

                <div className="w-full">
                  <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-10"
                      onClick={handleCopy}
                  >
                      {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? 'Copiado!' : 'Copiar Código Pix'}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-destructive">Insira um valor válido.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
