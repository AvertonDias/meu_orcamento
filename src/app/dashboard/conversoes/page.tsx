'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Ruler,
  Weight,
  BetweenHorizonalStart,
  Bot,
  ArrowRightLeft,
  DollarSign,
  PackagePlus,
  Loader2,
  Clock,
  Droplets,
  Container,
} from 'lucide-react';
import {
  formatNumber,
  formatCurrency,
  maskCurrency,
  maskDecimal
} from '@/lib/utils';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { addMaterial, updateMaterial } from '@/services/materiaisService';
import type { MaterialItem } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';

/* =======================
   CONSTANTES
======================= */

const DENSIDADES: Record<string, number> = {
  aluminio: 2700,
  galvanizado: 7850
};

const CONVERSION_FACTORS = {
  length: { m: 1, km: 0.001, cm: 100, mm: 1000, in: 39.3701, ft: 3.28084 },
  mass: { kg: 1, t: 0.001, g: 1000 },
  volume: { L: 1, ml: 1000, m3: 0.001, gal: 0.264172, floz: 33.814 },
  time: { s: 1, min: 1/60, h: 1/3600, day: 1/86400 }
};

type ConvType = keyof typeof CONVERSION_FACTORS;
type LengthUnit = keyof typeof CONVERSION_FACTORS.length;
type MassUnit = keyof typeof CONVERSION_FACTORS.mass;
type VolumeUnit = keyof typeof CONVERSION_FACTORS.volume;
type TimeUnit = keyof typeof CONVERSION_FACTORS.time;
type Unit = LengthUnit | MassUnit | VolumeUnit | TimeUnit;

const UNIT_LABELS: Record<ConvType, Record<string, string>> = {
  length: {
    m: 'Metro (m)',
    km: 'Quilômetro (km)',
    cm: 'Centímetro (cm)',
    mm: 'Milímetro (mm)',
    in: 'Polegada (in)',
    ft: 'Pé (ft)',
  },
  mass: {
    kg: 'Quilograma (kg)',
    t: 'Tonelada (t)',
    g: 'Grama (g)',
  },
  volume: {
    L: 'Litro (L)',
    ml: 'Mililitro (ml)',
    m3: 'Metro Cúbico (m³)',
    gal: 'Galão Americano (gal)',
    floz: 'Onça Líquida (fl-oz)',
  },
  time: {
    s: 'Segundo (s)',
    min: 'Minuto (min)',
    h: 'Hora (h)',
    day: 'Dia (day)',
  },
};

type PriceInputMode = 'kg' | 'total';

/* =======================
   HELPERS
======================= */

const normalizeString = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[,]/g, '.')
    .replace(/\s+/g, ' ')
    .trim();

const parseCurrency = (value: string) =>
  Number(value.replace(/[^\d]/g, '')) / 100;

/* =======================
   COMPONENTE
======================= */

export default function ConversoesPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const [peso, setPeso] = useState('');
  const [largura, setLargura] = useState('');
  const [espessura, setEspessura] = useState('');
  const [material, setMaterial] = useState('galvanizado');
  const [priceInputMode, setPriceInputMode] =
    useState<PriceInputMode>('kg');
  const [valorInput, setValorInput] = useState('');
  const [quantidadeMinimaStr, setQuantidadeMinimaStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [convType, setConvType] = useState<ConvType>('length');
  const [unitValue, setUnitValue] = useState('');
  const [fromUnit, setFromUnit] = useState<Unit>('m');
  const [toUnit, setToUnit] = useState<Unit>('cm');

  const materiais = useLiveQuery(() => user ? db.materiais.where('userId').equals(user.uid).toArray() : [], [user])?.map(m => m.data);

  const [conflictingItem, setConflictingItem] =
    useState<MaterialItem | null>(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  const fetchMateriais = useCallback(async () => {
    if (!user) return;
    try {
      // a busca agora é feita pelo useLiveQuery
    } catch {
      toast({
        title: 'Erro ao carregar materiais',
        variant: 'destructive'
      });
    }
  }, [user, toast]);

  useEffect(() => {
    fetchMateriais();
  }, [fetchMateriais]);
  
  useEffect(() => {
    const units = Object.keys(CONVERSION_FACTORS[convType]);
    setFromUnit(units[0] as Unit);
    setToUnit(units[1] as Unit);
  }, [convType]);

  /* =======================
     CÁLCULO CALHA
  ======================= */

  const resultadoCalha = useMemo(() => {
    const P = parseFloat(peso.replace(',', '.'));
    const L = parseFloat(largura);
    const E = parseFloat(espessura.replace(',', '.'));
    const D = DENSIDADES[material];
    const V = parseCurrency(valorInput);

    if (![P, L, E, D].every(v => v > 0)) return null;

    const metros = P / ((L / 1000) * (E / 1000) * D);

    let custoTotal = null;
    let precoPorMetro = null;

    if (V > 0) {
      custoTotal =
        priceInputMode === 'kg' ? V * P : V;
      precoPorMetro = custoTotal / metros;
    }

    return { metros, custoTotal, precoPorMetro };
  }, [peso, largura, espessura, material, valorInput, priceInputMode]);

  /* =======================
     CONVERSÃO UNIDADE
  ======================= */

  const resultadoUnidade = useMemo(() => {
    const value = parseFloat(unitValue.replace(',', '.'));
    if (isNaN(value)) return '';

    const factors = CONVERSION_FACTORS[convType];
    const fromFactor = (factors as Record<Unit, number>)[fromUnit];
    const toFactor = (factors as Record<Unit, number>)[toUnit];
    
    if (fromFactor === undefined || toFactor === undefined) return '';

    const base = value / fromFactor;
    return formatNumber(base * toFactor, 3);
}, [unitValue, fromUnit, toUnit, convType]);

  /* =======================
     AÇÕES
  ======================= */

  const resetForm = useCallback(() => {
    setPeso('');
    setLargura('');
    setEspessura('');
    setValorInput('');
    setQuantidadeMinimaStr('');
    setConflictingItem(null);
  }, []);

  const handleAdicionarAoEstoque = useCallback(async (updateExisting = false) => {
    if (!user || !resultadoCalha?.precoPorMetro) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha todos os campos para calcular e adicionar ao estoque.',
        variant: 'destructive'
      });
      return;
    }
  
    const descricao = `Calha ${material} ${largura}mm ${espessura}mm`;
    const normalizedDesc = normalizeString(descricao);
    const quantidadeMinima = parseFloat(quantidadeMinimaStr.replace(',', '.')) || null;
  
    const itemData: Omit<MaterialItem, 'id' | 'userId'> = {
      descricao,
      unidade: 'm',
      precoUnitario: resultadoCalha.precoPorMetro,
      quantidade: Math.floor(resultadoCalha.metros),
      quantidadeMinima,
      tipo: 'item'
    };
  
    if (updateExisting && conflictingItem) {
      setIsSubmitting(true);
      try {
        await updateMaterial(user.uid, conflictingItem.id, itemData);
        toast({ title: 'Material atualizado com sucesso!' });
      } catch {
        toast({ title: 'Erro ao atualizar material', variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
        setIsUpdateConfirmOpen(false);
        resetForm();
      }
      return;
    }
  
    const existente = materiais?.find(
      m => normalizeString(m.descricao) === normalizedDesc && m.tipo === 'item'
    );
  
    if (existente) {
      setConflictingItem(existente);
      setIsUpdateConfirmOpen(true);
      return;
    }
  
    setIsSubmitting(true);
    try {
      await addMaterial(user.uid, itemData);
      toast({ title: 'Material adicionado com sucesso!' });
      resetForm();
    } catch {
      toast({ title: 'Erro ao adicionar material', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, resultadoCalha, material, largura, espessura, quantidadeMinimaStr, materiais, conflictingItem, toast, resetForm]);

  /* =======================
     RENDER
  ======================= */

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Conversor de Bobina para Calha
          </CardTitle>
          <CardDescription>
            O cálculo de rendimento usa a fórmula: Peso / (Largura × Espessura × Densidade). As densidades usadas são: Aço Galvanizado (7850 kg/m³) e Alumínio (2700 kg/m³).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Inputs */}
            <div className="space-y-2">
              <Label htmlFor="peso" className="flex items-center gap-1"><Weight size={14} /> Peso da Bobina (kg)</Label>
              <Input id="peso" placeholder="Ex: 25" value={peso} onChange={e => setPeso(maskDecimal(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="largura" className="flex items-center gap-1"><Ruler size={14} /> Largura (mm)</Label>
              <Input id="largura" placeholder="Ex: 300" value={largura} onChange={e => setLargura(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="espessura" className="flex items-center gap-1"><BetweenHorizonalStart size={14} /> Espessura (mm)</Label>
              <Input id="espessura" placeholder="Ex: 0,43" value={espessura} onChange={e => setEspessura(maskDecimal(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger id="material"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="galvanizado">Aço Galvanizado</SelectItem>
                  <SelectItem value="aluminio">Alumínio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Custo */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <Label className="flex-shrink-0 flex items-center gap-1"><DollarSign size={14}/> Custo</Label>
                <Select value={priceInputMode} onValueChange={(v) => setPriceInputMode(v as PriceInputMode)}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="kg">Preço por kg</SelectItem>
                        <SelectItem value="total">Preço total</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="R$ 0,00" value={valorInput} onChange={(e) => setValorInput(maskCurrency(e.target.value))} />
              </div>
            </CardContent>
          </Card>
          
          {/* Resultados */}
          {resultadoCalha && (
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertTitle>Resultado do Cálculo</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p><strong>Rendimento:</strong> <span className="text-primary font-bold">{formatNumber(resultadoCalha.metros, 2)} metros</span></p>
                {resultadoCalha.precoPorMetro !== null && (
                   <p><strong>Custo por Metro:</strong> <span className="text-primary font-bold">{formatCurrency(resultadoCalha.precoPorMetro)}</span></p>
                )}
                {resultadoCalha.custoTotal !== null && (
                   <p><strong>Custo Total da Bobina:</strong> {formatCurrency(resultadoCalha.custoTotal)}</p>
                )}
              </AlertDescription>
              <CardFooter className="p-0 pt-4 mt-4 border-t">
                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <div className="space-y-2 flex-1">
                        <Label htmlFor="qt-minima">Estoque mínimo (opcional)</Label>
                        <Input id="qt-minima" placeholder="Ex: 10" value={quantidadeMinimaStr} onChange={(e) => setQuantidadeMinimaStr(maskDecimal(e.target.value))} />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={() => handleAdicionarAoEstoque()} disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <PackagePlus className="mr-2" size={16} />}
                        Adicionar ao Estoque
                      </Button>
                    </div>
                  </div>
              </CardFooter>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-6 w-6 text-primary"/>
                Conversor de Unidades
            </CardTitle>
            <CardDescription>
                Ferramenta rápida para converter medidas comuns.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Tipo de Conversão</Label>
                <Select value={convType} onValueChange={(v) => setConvType(v as ConvType)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="length">Comprimento</SelectItem>
                        <SelectItem value="mass">Massa/Peso</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="time">Tempo</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="space-y-2">
                    <Label>De:</Label>
                    <div className="flex gap-2">
                        <Input placeholder='0,00' value={unitValue} onChange={e => setUnitValue(maskDecimal(e.target.value))} />
                         <Select value={fromUnit} onValueChange={(v) => setFromUnit(v as Unit)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {Object.entries(UNIT_LABELS[convType]).map(([unit, label]) => (
                                    <SelectItem key={unit} value={unit}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="self-end pb-2">
                    <ArrowRightLeft size={16} className="text-muted-foreground"/>
                </div>
                <div className="space-y-2">
                    <Label>Para:</Label>
                    <div className="flex gap-2">
                        <Input value={resultadoUnidade} readOnly className="font-bold text-primary bg-muted/50"/>
                        <Select value={toUnit} onValueChange={(v) => setToUnit(v as Unit)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                               {Object.entries(UNIT_LABELS[convType]).map(([unit, label]) => (
                                    <SelectItem key={unit} value={unit}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      <AlertDialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Material já existe</AlertDialogTitle>
                <AlertDialogDescription>
                    O material &quot;{conflictingItem?.descricao}&quot; já está cadastrado com o preço de {formatCurrency(conflictingItem?.precoUnitario || 0)}/m. Deseja atualizar o preço para {formatCurrency(resultadoCalha?.precoPorMetro || 0)}/m e somar a quantidade?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConflictingItem(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleAdicionarAoEstoque(true)}>Sim, Atualizar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
