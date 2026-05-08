
'use client';

import React, { useMemo } from 'react';
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
import { Copy, Check, QrCode } from 'lucide-react';

interface PixModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: Orcamento | null;
  empresa: EmpresaData | null;
}

export function PixModal({ isOpen, onOpenChange, orcamento, empresa }: PixModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const pixData = useMemo(() => {
    if (!orcamento || !empresa?.chavePix) return null;

    try {
      const payload = generatePixPayload({
        chave: empresa.chavePix,
        beneficiario: empresa.nome,
        cidade: empresa.pixCidade || 'CIDADE',
        valor: orcamento.totalVenda,
        identificador: orcamento.numeroOrcamento.replace(/\D/g, ''),
      });

      return {
        payload,
        qrCodeUrl: getPixQRCodeUrl(payload),
      };
    } catch (e) {
      console.error('Erro ao gerar payload Pix:', e);
      return null;
    }
  }, [orcamento, empresa]);

  const handleCopy = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      setCopied(true);
      toast({ title: 'Código Pix copiado!' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!orcamento || !empresa) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Pagamento via Pix
          </DialogTitle>
          <DialogDescription>
            Apresente este QR Code para o cliente ou envie o código "Copia e Cola".
          </DialogDescription>
        </DialogHeader>

        {!empresa.chavePix ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-destructive font-medium">
              Chave Pix não configurada!
            </p>
            <p className="text-xs text-muted-foreground">
              Vá em Configurações para cadastrar sua chave e gerar QR Codes automaticamente.
            </p>
          </div>
        ) : pixData ? (
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Valor a pagar</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(orcamento.totalVenda)}
              </p>
            </div>

            <div className="bg-white p-2 rounded-lg border shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pixData.qrCodeUrl}
                alt="QR Code Pix"
                className="w-56 h-56"
              />
            </div>

            <div className="w-full space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Código Copia e Cola
              </Label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md border text-[10px] font-mono break-all line-clamp-2 overflow-hidden">
                {pixData.payload}
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
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-destructive">Erro ao gerar código Pix.</p>
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
