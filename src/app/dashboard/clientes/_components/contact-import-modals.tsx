'use client';

import React, { useState, useEffect } from 'react';
import type { ClienteData } from '@/lib/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

/* -------------------------------------------------------------------------- */
/* TIPOS                                                                       */
/* -------------------------------------------------------------------------- */

export interface SelectedContactDetails {
  name: string[];
  email: string[];
  tel: string[];
  address: string[];
}

interface ContactImportModalsProps {
  isContactSelectionModalOpen: boolean;
  setIsContactSelectionModalOpen: (isOpen: boolean) => void;
  selectedContactDetails: SelectedContactDetails | null;
  onConfirmContactSelection: (selectedData: Partial<ClienteData>) => void;

  isDuplicateAlertOpen: boolean;
  setIsDuplicateAlertOpen: (isOpen: boolean) => void;
  duplicateMessage: string;

  isApiNotSupportedAlertOpen: boolean;
  setIsApiNotSupportedAlertOpen: (isOpen: boolean) => void;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                     */
/* -------------------------------------------------------------------------- */

const normalizePhone = (value: string) =>
  value.replace(/\D/g, '').replace(/^55/, '');

const normalizeEmail = (value: string) =>
  value.trim().toLowerCase();

/* -------------------------------------------------------------------------- */
/* COMPONENTE                                                                   */
/* -------------------------------------------------------------------------- */

export function ContactImportModals({
  isContactSelectionModalOpen,
  setIsContactSelectionModalOpen,
  selectedContactDetails,
  onConfirmContactSelection,
  isDuplicateAlertOpen,
  setIsDuplicateAlertOpen,
  duplicateMessage,
  isApiNotSupportedAlertOpen,
  setIsApiNotSupportedAlertOpen,
}: ContactImportModalsProps) {
  const [selectedTel, setSelectedTel] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /* RESET AO ABRIR MODAL                                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!selectedContactDetails) return;

    setSelectedTel(selectedContactDetails.tel?.[0] ?? null);
    setSelectedEmail(selectedContactDetails.email?.[0] ?? null);
    setSelectedAddress(selectedContactDetails.address?.[0] ?? null);
  }, [selectedContactDetails]);

  /* ------------------------------------------------------------------------ */
  /* CONFIRMAÇÃO                                                             */
  /* ------------------------------------------------------------------------ */

  const handleConfirm = () => {
    if (!selectedContactDetails) return;

    const data: Partial<ClienteData> = {
      nome: selectedContactDetails.name?.[0]?.trim() || 'Sem nome',
    };

    if (selectedTel) {
      data.telefones = [
        {
          nome: 'Principal',
          numero: normalizePhone(selectedTel),
        },
      ];
    }

    if (selectedEmail) {
      data.email = normalizeEmail(selectedEmail);
    }

    if (selectedAddress) {
      data.endereco = selectedAddress;
    }

    onConfirmContactSelection(data);
  };

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      {/* MODAL DE SELEÇÃO */}
      <Dialog
        open={isContactSelectionModalOpen}
        onOpenChange={setIsContactSelectionModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar dados do contato</DialogTitle>
            <DialogDescription>
              O contato possui mais de uma informação. Escolha quais deseja usar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedContactDetails?.tel && selectedContactDetails.tel.length > 1 && (
              <div>
                <Label>Telefone</Label>
                <RadioGroup
                  value={selectedTel ?? undefined}
                  onValueChange={setSelectedTel}
                >
                  {selectedContactDetails.tel.map(t => (
                    <div key={t} className="flex items-center gap-2">
                      <RadioGroupItem value={t} id={`tel-${t}`} />
                      <Label htmlFor={`tel-${t}`}>{t}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {selectedContactDetails?.email && selectedContactDetails.email.length > 1 && (
              <div>
                <Label>Email</Label>
                <RadioGroup
                  value={selectedEmail ?? undefined}
                  onValueChange={setSelectedEmail}
                >
                  {selectedContactDetails.email.map(e => (
                    <div key={e} className="flex items-center gap-2">
                      <RadioGroupItem value={e} id={`email-${e}`} />
                      <Label htmlFor={`email-${e}`}>{e}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {selectedContactDetails?.address && selectedContactDetails.address.length > 1 && (
              <div>
                <Label>Endereço</Label>
                <RadioGroup
                  value={selectedAddress ?? undefined}
                  onValueChange={setSelectedAddress}
                >
                  {selectedContactDetails.address.map((a, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <RadioGroupItem value={a} id={`addr-${index}`} />
                      <Label htmlFor={`addr-${index}`}>{a}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose>
              <Button onClick={handleConfirm}>
                Confirmar importação
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERTA DUPLICADO */}
      <AlertDialog
        open={isDuplicateAlertOpen}
        onOpenChange={setIsDuplicateAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cliente já existente</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* API NÃO SUPORTADA */}
      <AlertDialog
        open={isApiNotSupportedAlertOpen}
        onOpenChange={setIsApiNotSupportedAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Função indisponível</AlertDialogTitle>
            <AlertDialogDescription>
              Este dispositivo ou navegador não suporta importação de contatos.
              Utilize um celular compatível ou cadastre manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
