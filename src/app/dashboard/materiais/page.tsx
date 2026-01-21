'use client';

import React, { useState, FormEvent, useMemo } from 'react';
import type { MaterialItem } from '@/lib/types';

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';

import {
  Trash2, Wrench, PlusCircle, Pencil, Loader2,
  Package, Construction, Search, XCircle
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose, DialogDescription
} from '@/components/ui/dialog';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber, maskCurrency, maskDecimal, maskInteger } from '@/lib/utils';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

import {
  addMaterial, deleteMaterial, updateMaterial
} from '@/services/materiaisService';

import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';

import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';

/* ===============================
   CONSTANTES
================================ */

const initialNewItemState: Omit<MaterialItem, 'id' | 'userId'> = {
  descricao: '',
  unidade: 'un',
  precoUnitario: null,
  tipo: 'item',
  quantidade: null,
  quantidadeMinima: null,
};

const unidadesDeMedida = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'h', label: 'Hora (h)' },
  { value: 'dia', label: 'Dia de Serviço (dia)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm²', label: 'Metro Quadrado (m²)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'serv', label: 'Serviço (serv)' },
];

const integerUnits = ['un', 'h', 'serv', 'dia'];

const normalizeString = (str: string) =>
  str?.trim().toLowerCase().replace(/,/g, '.').replace(/\s+/g, ' ') || '';

/* ===============================
   COMPONENTE
================================ */

export default function MateriaisPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'item' | 'servico'>('item');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const materiais = useLiveQuery(
    () => user
      ? db.materiais.where('userId').equals(user.uid).sortBy('data.descricao')
      : [],
    [user]
  )?.map(m => m.data);

  const isLoadingData = loadingAuth || materiais === undefined;

  const [newItem, setNewItem] = useState({ ...initialNewItemState });

  const [precoUnitarioStr, setPrecoUnitarioStr] = useState('');
  const [quantidadeStr, setQuantidadeStr] = useState('');
  const [quantidadeMinimaStr, setQuantidadeMinimaStr] = useState('');

  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [editingPrecoUnitarioStr, setEditingPrecoUnitarioStr] = useState('');
  const [editingQuantidadeStr, setEditingQuantidadeStr] = useState('');
  const [editingQuantidadeMinimaStr, setEditingQuantidadeMinimaStr] = useState('');

  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [conflictingItem, setConflictingItem] = useState<MaterialItem | null>(null);
  
  const isNewItemUnitInteger = useMemo(() => integerUnits.includes(newItem.unidade), [newItem.unidade]);
  const isEditingItemUnitInteger = useMemo(() => editingMaterial ? integerUnits.includes(editingMaterial.unidade) : false, [editingMaterial]);


  /* ===============================
     FILTRO
  ================================ */

  const filteredMateriais = useMemo(() => {
    if (!materiais) return [];
    if (!searchTerm) return materiais;

    return materiais.filter(m =>
      m.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materiais, searchTerm]);

  /* ===============================
     HANDLERS
  ================================ */

  const handleTabChange = (value: string) => {
    const tipo = value as 'item' | 'servico';
    setActiveTab(tipo);
    setNewItem({
      ...initialNewItemState,
      tipo,
      unidade: tipo === 'servico' ? 'serv' : 'un'
    });
    setPrecoUnitarioStr('');
    setQuantidadeStr('');
    setQuantidadeMinimaStr('');
  };

  const handleAdicionarMaterial = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!newItem.descricao || newItem.precoUnitario == null) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Descrição e preço são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const existente = materiais?.find(
      m =>
        normalizeString(m.descricao) === normalizeString(newItem.descricao) &&
        m.tipo === newItem.tipo
    );

    if (existente) {
      setConflictingItem(existente);
      setIsUpdateConfirmOpen(true);
      return;
    }

    setIsSubmitting(true);
    await addMaterial(user.uid, newItem);
    setIsSubmitting(false);

    toast({ title: 'Sucesso!', description: 'Cadastro realizado.' });
    handleTabChange(activeTab);
  };
  
    const handleSalvarEdicao = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !editingMaterial) return;

    setIsSubmitting(true);
    try {
        const { id, userId, ...data } = editingMaterial;
        await updateMaterial(user.uid, id, data);
        
        toast({ title: 'Sucesso!', description: 'Item atualizado.' });
        setIsEditModalOpen(false);
        setEditingMaterial(null);
    } catch {
        toast({ title: 'Erro', description: 'Não foi possível atualizar o item.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleConfirmarRemocao = async (materialId: string) => {
    try {
      await deleteMaterial(materialId);
      toast({ title: 'Item removido com sucesso', variant: 'destructive' });
    } catch (error) {
      console.error("Erro ao remover item:", error);
      toast({ title: 'Erro ao remover item', description: 'Não foi possível remover o item. Tente novamente.', variant: 'destructive' });
    }
  };


  const handleOpenEditModal = (material: MaterialItem) => {
    setEditingMaterial(material);
    setEditingPrecoUnitarioStr(material.precoUnitario ? maskCurrency(material.precoUnitario.toFixed(2)) : '');
    
    const isInteger = integerUnits.includes(material.unidade);
    setEditingQuantidadeStr(material.quantidade !== null ? (isInteger ? maskInteger(String(material.quantidade)) : formatNumber(material.quantidade, 2)) : '');
    setEditingQuantidadeMinimaStr(material.quantidadeMinima !== null ? (isInteger ? maskInteger(String(material.quantidadeMinima)) : formatNumber(material.quantidadeMinima, 2)) : '');

    setIsEditModalOpen(true);
  };

  /* ===============================
     RENDER
  ================================ */

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench /> Itens e Serviços</CardTitle>
          <CardDescription>Cadastre aqui os produtos e mão de obra que você utiliza nos orçamentos.</CardDescription>
        </CardHeader>
        <CardContent>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="item"><Package className="mr-2 h-4 w-4" /> Itens de Estoque</TabsTrigger>
              <TabsTrigger value="servico"><Construction className="mr-2 h-4 w-4" /> Mão de Obra / Serviços</TabsTrigger>
            </TabsList>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="add-item">
                <AccordionTrigger>
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo {activeTab === 'item' ? 'Item' : 'Serviço'}
                </AccordionTrigger>
                <AccordionContent>
                  <form onSubmit={handleAdicionarMaterial} className="space-y-4 pt-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="descricao">Descrição</Label>
                        <Input 
                          id="descricao"
                          placeholder={activeTab === 'item' ? 'Ex: Calha galvanizada 30cm' : 'Ex: Instalação de calha'}
                          value={newItem.descricao}
                          onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unidade">Unidade de Medida</Label>
                        <Select
                          value={newItem.unidade}
                          onValueChange={(value) => setNewItem({ ...newItem, unidade: value })}
                        >
                          <SelectTrigger id="unidade"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className={cn("grid sm:grid-cols-2 gap-4", activeTab === 'item' && "sm:grid-cols-3")}>
                      <div className="space-y-2">
                        <Label htmlFor="precoUnitario">Preço de Custo (R$)</Label>
                        <Input 
                          id="precoUnitario"
                          placeholder="R$ 0,00"
                          value={precoUnitarioStr}
                          onChange={(e) => {
                            const masked = maskCurrency(e.target.value);
                            setPrecoUnitarioStr(masked);
                            setNewItem({...newItem, precoUnitario: parseFloat(masked.replace(/[^\d,]/g, '').replace(',', '.')) || null});
                          }}
                          required
                        />
                      </div>
                      {activeTab === 'item' && (
                        <>
                           <div className="space-y-2">
                             <Label htmlFor="quantidade">Qtd. em Estoque</Label>
                             <Input 
                               id="quantidade"
                               placeholder="Opcional"
                               value={quantidadeStr}
                               onChange={(e) => {
                                 const masked = isNewItemUnitInteger ? maskInteger(e.target.value) : maskDecimal(e.target.value);
                                 setQuantidadeStr(masked);
                                 setNewItem({...newItem, quantidade: parseFloat(masked.replace(',', '.')) || null});
                               }}
                             />
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor="quantidadeMinima">Estoque Mínimo</Label>
                             <Input 
                               id="quantidadeMinima"
                               placeholder="Opcional"
                               value={quantidadeMinimaStr}
                               onChange={(e) => {
                                 const masked = isNewItemUnitInteger ? maskInteger(e.target.value) : maskDecimal(e.target.value);
                                 setQuantidadeMinimaStr(masked);
                                 setNewItem({...newItem, quantidadeMinima: parseFloat(masked.replace(',', '.')) || null});
                               }}
                             />
                           </div>
                        </>
                      )}
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                      Adicionar {activeTab === 'item' ? 'Item' : 'Serviço'}
                    </Button>
                  </form>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Tabs>

        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Itens e Serviços</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar por descrição..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}><XCircle className="h-5 w-5 text-muted-foreground"/></Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : filteredMateriais?.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nenhum item encontrado.</p>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden">
                <Accordion type="multiple" className="w-full">
                  {filteredMateriais.map(m => (
                    <AccordionItem value={m.id} key={m.id}>
                       <AccordionTrigger className="text-left hover:no-underline">
                          <div className="flex flex-col gap-1">
                              <span className="font-medium text-base text-primary">{m.descricao}</span>
                              <span className="text-sm text-muted-foreground">{formatCurrency(m.precoUnitario)} / {m.unidade}</span>
                          </div>
                       </AccordionTrigger>
                       <AccordionContent className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-muted-foreground">Tipo:</span>
                            <Badge variant={m.tipo === 'item' ? 'secondary' : 'outline'}>
                              {m.tipo === 'item' ? <Package className="mr-1 h-3 w-3" /> : <Construction className="mr-1 h-3 w-3" />}
                              {m.tipo === 'item' ? 'Item' : 'Serviço'}
                            </Badge>
                          </div>

                          {m.tipo === 'item' && (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-muted-foreground">Estoque:</span>
                                <span className={cn(m.quantidade !== null && m.quantidadeMinima !== null && m.quantidade < m.quantidadeMinima && "text-destructive font-bold")}>
                                  {m.quantidade !== null ? formatNumber(m.quantidade, integerUnits.includes(m.unidade) ? 0 : 2) : 'N/A'}
                                </span>
                              </div>
                               {m.quantidadeMinima !== null && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="font-medium text-muted-foreground">Estoque Mínimo:</span>
                                  <span>{formatNumber(m.quantidadeMinima, integerUnits.includes(m.unidade) ? 0 : 2)}</span>
                                </div>
                               )}
                            </>
                          )}

                          <div className="flex gap-2 pt-4 border-t">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(m)} className="flex-1">
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger>
                                <span tabIndex={-1}>
                                <Button variant="destructive" size="sm" className="flex-1 w-full">
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </Button>
                                </span>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita e irá remover &quot;{m.descricao}&quot; permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleConfirmarRemocao(m.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                       </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Desktop View */}
              <div className="hidden md:block border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Preço de Custo</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMateriais?.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.descricao}</TableCell>
                        <TableCell>
                          <Badge variant={m.tipo === 'item' ? 'secondary' : 'outline'}>
                              {m.tipo === 'item' ? <Package className="mr-1 h-3 w-3" /> : <Construction className="mr-1 h-3 w-3" />}
                              {m.tipo === 'item' ? 'Item' : 'Serviço'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(m.precoUnitario)} / {m.unidade}</TableCell>
                        <TableCell className={cn("text-right", m.quantidade !== null && m.quantidadeMinima !== null && m.quantidade < m.quantidadeMinima && "text-destructive font-bold")}>
                          {m.tipo === 'item' && m.quantidade !== null ? formatNumber(m.quantidade, integerUnits.includes(m.unidade) ? 0 : 2) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger>
                              <span tabIndex={-1}>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                              </span>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita e irá remover &quot;{m.descricao}&quot; permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleConfirmarRemocao(m.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

        {/* DIALOG EDITAR */}
        {editingMaterial && (
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent
                    onPointerDownOutside={(e) => {
                        if (Capacitor.isNativePlatform()) e.preventDefault();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Editar {editingMaterial.tipo === 'item' ? 'Item' : 'Serviço'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSalvarEdicao} className="space-y-4 pt-4">
                         <div className="space-y-2">
                           <Label htmlFor="edit-descricao">Descrição</Label>
                           <Input 
                             id="edit-descricao"
                             value={editingMaterial.descricao}
                             onChange={(e) => setEditingMaterial({ ...editingMaterial, descricao: e.target.value })}
                             required
                           />
                         </div>
                         
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-unidade">Unidade</Label>
                                <Select
                                value={editingMaterial.unidade}
                                onValueChange={(value) => setEditingMaterial({ ...editingMaterial, unidade: value })}
                                >
                                <SelectTrigger id="edit-unidade"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {unidadesDeMedida.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-preco">Preço de Custo (R$)</Label>
                                <Input 
                                    id="edit-preco"
                                    value={editingPrecoUnitarioStr}
                                    onChange={(e) => {
                                        const masked = maskCurrency(e.target.value);
                                        setEditingPrecoUnitarioStr(masked);
                                        setEditingMaterial({...editingMaterial, precoUnitario: parseFloat(masked.replace(/[^\d,]/g, '').replace(',', '.')) || null});
                                    }}
                                    required
                                />
                            </div>
                        </div>

                         {editingMaterial.tipo === 'item' && (
                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                               <Label htmlFor="edit-quantidade">Qtd. em Estoque</Label>
                               <Input 
                                 id="edit-quantidade"
                                 value={editingQuantidadeStr}
                                 onChange={(e) => {
                                     const masked = isEditingItemUnitInteger ? maskInteger(e.target.value) : maskDecimal(e.target.value);
                                     setEditingQuantidadeStr(masked);
                                     setEditingMaterial({...editingMaterial, quantidade: parseFloat(masked.replace(',', '.')) || null });
                                 }}
                               />
                             </div>
                             <div className="space-y-2">
                               <Label htmlFor="edit-qmin">Estoque Mínimo</Label>
                               <Input 
                                 id="edit-qmin"
                                 value={editingQuantidadeMinimaStr}
                                 onChange={(e) => {
                                     const masked = isEditingItemUnitInteger ? maskInteger(e.target.value) : maskDecimal(e.target.value);
                                     setEditingQuantidadeMinimaStr(masked);
                                     setEditingMaterial({...editingMaterial, quantidadeMinima: parseFloat(masked.replace(',', '.')) || null });
                                 }}
                               />
                             </div>
                           </div>
                         )}
                         <DialogFooter>
                            <DialogClose>
                                <Button variant="outline" type="button">Cancelar</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'Salvar Alterações'}
                            </Button>
                         </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        )}

        {/* DIALOG CONFIRMA UPDATE */}
        <AlertDialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Item já existe</AlertDialogTitle>
                    <AlertDialogDescription>
                       O item &quot;{conflictingItem?.descricao}&quot; já está cadastrado. Deseja substituí-lo com os novos dados?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConflictingItem(null)}>Não</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => {
                         if (!user || !conflictingItem) return;
                         setIsSubmitting(true);
                         await updateMaterial(user.uid, conflictingItem.id, newItem);
                         setIsSubmitting(false);
                         setIsUpdateConfirmOpen(false);
                         toast({ title: 'Sucesso!', description: 'Item atualizado.' });
                         handleTabChange(activeTab);
                    }}>
                        Sim, Substituir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
