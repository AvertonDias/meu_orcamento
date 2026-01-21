
'use client';

import React, { FormEvent, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { EmpresaData } from '@/lib/types';
import { useUnifiedTheme } from '@/contexts/unified-theme-provider'; // Importando o contexto

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

import {
  Building,
  Save,
  CheckCircle,
  XCircle,
  Upload,
  Trash2,
  KeyRound,
  Mail,
  Settings,
  User,
  PlusCircle,
  Loader2,
  MessageSquare,
  RotateCcw,
  Info,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { maskCpfCnpj, maskTelefone, validateCpfCnpj } from '@/lib/utils';

import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { sendPasswordResetEmail } from 'firebase/auth';

import { saveEmpresaData } from '@/services/empresaService';

import Image from 'next/image';
import { cn } from '@/lib/utils';

import { ThemePicker } from '@/components/theme-picker';
import { ThemeToggle } from '@/components/theme-toggle';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';
import { Badge } from '@/components/ui/badge';
import { useBeforeunload } from 'react-beforeunload';
import { useDirtyState } from '@/contexts/dirty-state-context';

/* =======================
   ESTADO INICIAL
======================= */

const initialEmpresaState: Omit<EmpresaData, 'id' | 'userId'> = {
  nome: '',
  endereco: '',
  telefones: [{ nome: 'Principal', numero: '', principal: true }],
  cnpj: '',
  logo: '',
  whatsappMessage:
    'Olá {Nome do Cliente}!\n\nSegue seu orçamento {Nº do Orçamento}:\n\n{Detalhes do Orçamento}\n\nTOTAL: {Valor Total}\n\nQualquer dúvida, estou à disposição!\n\n{Nome da Empresa}',
};

/* =======================
   COMPONENTE
======================= */

export default function ConfiguracoesPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [initialData, setInitialData] = useState<string>('');
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const { isDirty, setIsDirty } = useDirtyState();

  const empresaDexieArr = useLiveQuery(
    () => (user ? db.empresa.where('id').equals(user.uid).toArray() : []),
    [user]
  );

  const isLoadingData = loadingAuth || empresaDexieArr === undefined;
  
  const empresaDexie = useMemo(() => {
      if (isLoadingData || !empresaDexieArr) return undefined;
      return empresaDexieArr[0];
  }, [isLoadingData, empresaDexieArr]);

  const isNewUser = useMemo(() => {
    if (isLoadingData || !empresa) return false;
    return !empresa.nome || !empresa.endereco || !empresa.telefones.some(t => t.numero.trim());
  }, [isLoadingData, empresa]);

  /* =======================
     CARREGAMENTO INICIAL
  ======================= */

  useEffect(() => {
    if (isLoadingData) return;

    let loadedData: EmpresaData;
    if (empresaDexie?.data) {
      const dataFromDb = empresaDexie.data;
      loadedData = {
        ...initialEmpresaState,
        ...dataFromDb,
        // Garante que `telefones` seja um array não vazio, caso contrário, usa o padrão.
        telefones: (Array.isArray(dataFromDb.telefones) && dataFromDb.telefones.length > 0)
          ? dataFromDb.telefones
          : initialEmpresaState.telefones,
      };
    } else if (user) {
      loadedData = {
        ...initialEmpresaState,
        id: user.uid,
        userId: user.uid,
      };
    } else {
      return; // Sem usuário, não carrega nada.
    }
    
    setEmpresa(loadedData);
    setInitialData(JSON.stringify(loadedData));
    setIsDirty(false);
  }, [empresaDexie, user, isLoadingData, setIsDirty]);
  
  
  /* =======================
     AVISO DE SAIR SEM SALVAR
  ======================= */
  
  useEffect(() => {
    if (initialData) {
      const currentData = JSON.stringify(empresa);
      setIsDirty(currentData !== initialData);
    }
  }, [empresa, initialData, setIsDirty]);

  useBeforeunload(event => {
    if (isDirty) {
      event.preventDefault();
    }
  });


  /* =======================
     CPF / CNPJ
  ======================= */

  const cpfCnpjStatus = useMemo(() => {
    if (!empresa?.cnpj) return 'incomplete';
    return validateCpfCnpj(empresa.cnpj);
  }, [empresa?.cnpj]);

  const isCpfCnpjInvalid =
    empresa?.cnpj && cpfCnpjStatus === 'invalid';

  /* =======================
     HANDLERS
  ======================= */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!empresa) return;
    const { name, value } = e.target;

    const newValue =
      name === 'cnpj' ? maskCpfCnpj(value) : value;

    setEmpresa({ ...empresa, [name]: newValue });
  };

  const handleTelefoneChange = (
    index: number,
    field: 'nome' | 'numero',
    value: string
  ) => {
    if (!empresa) return;

    const telefones = [...empresa.telefones];
    telefones[index] = {
      ...telefones[index],
      [field]: field === 'numero' ? maskTelefone(value) : value,
    };

    setEmpresa({ ...empresa, telefones });
  };

  const handlePrincipalTelefoneChange = (index: number) => {
    if (!empresa) return;

    setEmpresa({
      ...empresa,
      telefones: empresa.telefones.map((t, i) => ({
        ...t,
        principal: i === index,
      })),
    });
  };

  const addTelefone = () => {
    if (!empresa) return;

    setEmpresa({
      ...empresa,
      telefones: [
        ...empresa.telefones,
        { nome: '', numero: '', principal: false },
      ],
    });
  };

  const removeTelefone = (index: number) => {
    if (!empresa || empresa.telefones.length <= 1) {
      toast({
        title: 'Ação não permitida',
        description: 'É necessário ao menos um telefone.',
        variant: 'destructive',
      });
      return;
    }

    const telefones = empresa.telefones.filter((_, i) => i !== index);

    if (!telefones.some(t => t.principal)) {
      telefones[0].principal = true;
    }

    setEmpresa({ ...empresa, telefones });
  };

  /* =======================
     LOGO
  ======================= */

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresa) return;

    const reader = new FileReader();
    reader.onload = e => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 200;

        let { width, height } = img;
        if (width > height && width > max) {
          height *= max / width;
          width = max;
        } else if (height > max) {
          width *= max / height;
          height = max;
        }

        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);

        setEmpresa({
          ...empresa,
          logo: canvas.toDataURL('image/jpeg', 0.8),
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    if (!empresa) return;
    setEmpresa({ ...empresa, logo: '' });
    toast({ title: 'Logo removido' });
  };

  const handleAddTagToMessage = (tag: string) => {
    const input = messageInputRef.current;
    if (!input || !empresa) return;
  
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
  
    const newMessage = text.substring(0, start) + tag + text.substring(end);
  
    setEmpresa({ ...empresa, whatsappMessage: newMessage });
  
    setTimeout(() => {
      input.focus();
      input.selectionStart = input.selectionEnd = start + tag.length;
    }, 0);
  };
  
  const handleResetMessage = () => {
    if (!empresa) return;
    setEmpresa({ ...empresa, whatsappMessage: initialEmpresaState.whatsappMessage });
    toast({ title: 'Mensagem restaurada para o padrão.' });
  };


  /* =======================
     SALVAR
  ======================= */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!empresa || !user) return;

    if (!empresa.nome || !empresa.endereco) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome e endereço são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (isCpfCnpjInvalid) {
      toast({
        title: 'Documento inválido',
        description: 'CPF ou CNPJ inválido.',
        variant: 'destructive',
      });
      return;
    }

    if (!empresa.telefones.some(t => t.numero.trim())) {
      toast({
        title: 'Telefone obrigatório',
        description: 'Informe ao menos um telefone.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const savedData = await saveEmpresaData(user.uid, {
        ...empresa,
        telefones: empresa.telefones.filter(t => t.numero.trim()),
      });
      
      setInitialData(JSON.stringify(savedData));
      setIsDirty(false);

      toast({
        title: 'Sucesso',
        description: 'Dados salvos com sucesso.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  /* =======================
     RESET SENHA
  ======================= */

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    await sendPasswordResetEmail(auth, user.email);
    toast({
      title: 'E-mail enviado',
      description: 'Confira sua caixa de entrada.',
    });
  };

  /* =======================
     RENDER
  ======================= */

  if (isLoadingData) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!empresa) {
    return <p className="p-6">Erro ao carregar dados da empresa.</p>;
  }

  const principalIndex =
    empresa.telefones.findIndex(t => t.principal) >= 0
      ? empresa.telefones.findIndex(t => t.principal)
      : 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings size={24} />
        Configurações
      </h1>

      {isNewUser && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Primeiros Passos</AlertTitle>
          <AlertDescription>
            Bem-vindo(a) ao Meu Orçamento! Para começar, preencha as informações da sua empresa abaixo. Nome, endereço e pelo menos um telefone são essenciais para criar orçamentos.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Dados da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building size={20} />
              Dados da Empresa
            </CardTitle>
            <CardDescription>
              Informações que aparecerão nos seus orçamentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Formulário */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Empresa</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={empresa.nome}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço Completo</Label>
                  <Input
                    id="endereco"
                    name="endereco"
                    value={empresa.endereco}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ / CPF</Label>
                  <div className="relative">
                    <Input
                      id="cnpj"
                      name="cnpj"
                      value={empresa.cnpj}
                      onChange={handleChange}
                      className={cn(isCpfCnpjInvalid && 'border-destructive')}
                    />
                    {empresa.cnpj && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {cpfCnpjStatus === 'valid' ? (
                          <CheckCircle className="text-green-500" size={16} />
                        ) : (
                          <XCircle className="text-destructive" size={16} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Logo */}
              <div className="space-y-2 flex flex-col items-center justify-center bg-muted/50 rounded-lg p-4">
                <Label>Logo da Empresa</Label>
                <div className="w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center bg-white overflow-hidden">
                  {empresa.logo ? (
                    <Image
                      src={empresa.logo}
                      alt="Logo"
                      width={128}
                      height={128}
                      className="object-cover"
                    />
                  ) : (
                    <Building className="text-muted-foreground" size={48} />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Label className="cursor-pointer">
                      <Upload size={16} className="mr-2" /> Enviar
                      <Input
                        type="file"
                        className="hidden"
                        accept="image/png, image/jpeg"
                        onChange={handleLogoChange}
                      />
                    </Label>
                  </Button>
                  {empresa.logo && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeLogo}
                    >
                      <Trash2 size={16} className="mr-2" /> Remover
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie JPG ou PNG.
                </p>
              </div>
            </div>
            {/* Telefones */}
            <div className="space-y-4">
              <Label>Telefones</Label>
              <RadioGroup
                value={String(principalIndex)}
                onValueChange={index => handlePrincipalTelefoneChange(Number(index))}
                className="space-y-4"
              >
                {empresa.telefones.map((tel, index) => (
                  <div key={index} className="space-y-2 rounded-md border p-3 bg-muted/20 relative">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={String(index)} id={`tel-principal-${index}`} />
                      <Label htmlFor={`tel-principal-${index}`} className="font-normal cursor-pointer">
                        Telefone Principal
                      </Label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                         <Label htmlFor={`tel-nome-${index}`} className="text-xs text-muted-foreground">Nome (Ex: Vendas)</Label>
                         <Input
                           id={`tel-nome-${index}`}
                           placeholder="Vendas"
                           value={tel.nome}
                           onChange={e =>
                             handleTelefoneChange(index, 'nome', e.target.value)
                           }
                         />
                      </div>
                       <div className="space-y-1">
                         <Label htmlFor={`tel-numero-${index}`} className="text-xs text-muted-foreground">Número de Telefone*</Label>
                         <Input
                           id={`tel-numero-${index}`}
                           placeholder="(DD) XXXXX-XXXX"
                           value={tel.numero}
                           onChange={e =>
                             handleTelefoneChange(index, 'numero', e.target.value)
                           }
                           required
                         />
                       </div>
                    </div>
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTelefone(index)}
                        disabled={empresa.telefones.length <= 1}
                        className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTelefone}
              >
                <PlusCircle size={16} className="mr-2" /> Adicionar Telefone
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mensagem WhatsApp */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare size={20} />
                    Mensagem Padrão do WhatsApp
                </CardTitle>
                <CardDescription>
                    Personalize o texto enviado ao compartilhar um orçamento.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="whatsappMessage">Texto da Mensagem</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleResetMessage}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Restaurar Padrão
                      </Button>
                    </div>
                    <Textarea
                        id="whatsappMessage"
                        name="whatsappMessage"
                        ref={messageInputRef}
                        value={empresa.whatsappMessage || ''}
                        onChange={handleChange}
                        rows={8}
                        placeholder="Olá {Nome do Cliente}! Segue seu orçamento..."
                    />
                 </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Tags disponíveis (clique para adicionar):</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" onClick={() => handleAddTagToMessage('{Nome do Cliente}')} className="cursor-pointer">Nome do Cliente</Badge>
                        <Badge variant="secondary" onClick={() => handleAddTagToMessage('{Nº do Orçamento}')} className="cursor-pointer">Nº do Orçamento</Badge>
                        <Badge variant="secondary" onClick={() => handleAddTagToMessage('{Detalhes do Orçamento}')} className="cursor-pointer">Detalhes do Orçamento</Badge>
                        <Badge variant="secondary" onClick={() => handleAddTagToMessage('{Valor Total}')} className="cursor-pointer">Valor Total</Badge>
                        <Badge variant="secondary" onClick={() => handleAddTagToMessage('{Nome da Empresa}')} className="cursor-pointer">Nome da Empresa</Badge>
                    </div>
                 </div>
            </CardContent>
        </Card>

        {/* Conta e Aparência */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} /> Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail size={16} /> E-mail
                </Label>
                <Input id="email" value={user?.email ?? ''} disabled />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handlePasswordReset}
              >
                <KeyRound size={16} className="mr-2" />
                Redefinir Senha
              </Button>
            </CardContent>
          </Card>

          {/* Aparência */}
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cores</Label>
                <ThemePicker />
              </div>
              <div className="space-y-2">
                <Label>Modo de Exibição</Label>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Salvar */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={!isDirty || isSaving}>
            {isSaving ? (
              <Loader2 size={20} className="animate-spin mr-2" />
            ) : (
              <Save size={20} className="mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </form>
    </div>
  );
}
