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
import { formatCurrency } from '@/lib/utils';
import { Copy, Check, QrCode, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  // Reseta para a chave principal ao abrir
  useEffect(() => {
    if (isOpen && empresa?.chavesPix) {
      const principalIndex = empresa.chavesPix.findIndex(k => k.principal);
      setSelectedKeyIndex(principalIndex >= 0 ? String(principalIndex) : '0');
    }
  }, [isOpen, empresa]);

  const pixData = useMemo(() => {
    if (!orcamento || !empresa) return null;

    const keys = empresa.chavesPix || [];
    const index = parseInt(selectedKeyIndex, 10);
    const activeKey = keys[index] || keys[0];
    
    // Fallback para campos legados
    const activeChave = activeKey?.chave || empresa.chavePix;
    const activeCidade = activeKey?.cidade || empresa.pixCidade || 'CIDADE';

    if (!activeChave) return null;

    try {
      // TxID estritamente alfanumérico: orcamento + numero (removendo qualquer caractere especial)
      const orcNumClean = orcamento.numeroOrcamento.replace(/[^a-zA-Z0-9]/g, '');
      const orcId = `orcamento${orcNumClean}`;

      const payload = generatePixPayload({
        chave: activeChave,
        beneficiario: empresa.nome,
        cidade: activeCidade,
        valor: orcamento.totalVenda,
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
  }, [orcamento, empresa, selectedKeyIndex]);

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

  // Se não houver orçamento, não renderiza nada (proteção básica de estado)
  if (!orcamento) return null;

  const hasMultipleKeys = (empresa?.chavesPix?.length || 0) > 1;
  const hasPixConfig = empresa && ((empresa.chavesPix && empresa.chavesPix.some(k => k.chave.trim())) || empresa.chavePix);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Pagamento via Pix
          </DialogTitle>
          <DialogDescription>
            {hasPixConfig 
              ? "Mostre o QR Code ou copie o código para o cliente."
              : "Configurações pendentes."}
          </DialogDescription>
        </DialogHeader>

        {!empresa || !hasPixConfig ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
            </div>
            <p className="text-sm font-medium">
              Chave Pix não configurada!
            </p>
            <p className="text-xs text-muted-foreground px-4">
              Para gerar cobranças via Pix, você precisa cadastrar sua chave em <strong>Configurações > Recebimento via Pix</strong>.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-2">
              Entendi
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 py-2">
            
            {hasMultipleKeys && (
              <div className="w-full space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <ArrowRightLeft className="h-3 w-3" /> Alterar Chave Pix
                </Label>
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

            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Valor a pagar</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(orcamento.totalVenda)}
              </p>
            </div>

            {pixData ? (
              <>
                <div className="bg-white p-2 rounded-lg border shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pixData.qrCodeUrl}
                    alt="QR Code Pix"
                    className="w-48 h-48"
                  />
                </div>

                <div className="w-full space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                      Código Copia e Cola
                    </Label>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md border text-[10px] font-mono break-all line-clamp-2 overflow-hidden">
                      {pixData.payload}
                    </div>
                  </div>
                  
                  <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleCopy}
                  >
                      {copied ? (
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                      <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copied ? 'Copiado!' : 'Copiar Código Pix'}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-destructive">Erro ao gerar código.</p>
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