'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { formatCurrency } from '@/lib/utils';
import type { Orcamento } from '@/lib/types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Banknote, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Loader2,
  BarChart3,
  Lightbulb,
  ShieldCheck,
  PiggyBank,
  Zap,
  CalendarDays
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import { 
  subMonths, 
  format as formatDate, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO,
  eachDayOfInterval,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartDataItem {
  label: string;
  recebido: number;
  aReceber: number;
  timestamp: Date;
}

const chartConfig = {
  recebido: {
    label: "Recebido",
    color: "#22c55e",
  },
  aReceber: {
    label: "A Receber",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

export default function FinanceiroPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  const orcamentosRaw = useLiveQuery(
    () => (user ? db.orcamentos.where('userId').equals(user.uid).toArray() : []),
    [user]
  );

  const orcamentosBase = useMemo(() => {
    if (!orcamentosRaw) return [];
    return orcamentosRaw.map(o => o.data).filter(o => o.status !== 'Recusado');
  }, [orcamentosRaw]);

  // Opções do seletor (Últimos 12 meses)
  const periodOptions = useMemo(() => {
    if (!mounted) return [];
    
    const options = [{ label: 'Todo o Período', value: 'all' }];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      options.push({
        label: formatDate(d, 'MMMM yyyy', { locale: ptBR }),
        value: formatDate(d, 'yyyy-MM')
      });
    }
    return options;
  }, [mounted]);

  // Filtragem de orçamentos por período para os CARDS
  const orcamentosFiltradosPeriodo = useMemo(() => {
    if (selectedPeriod === 'all') return orcamentosBase;
    return orcamentosBase.filter(o => o.dataCriacao.startsWith(selectedPeriod));
  }, [orcamentosBase, selectedPeriod]);

  // Cálculos financeiros totais (Respeita o período selecionado)
  const totais = useMemo(() => {
    return orcamentosFiltradosPeriodo.reduce(
      (acc, orc) => {
        const total = orc.totalVenda || 0;
        const pago = orc.valorPago || 0;
        const saldo = total - pago;

        acc.recebido += pago;
        acc.aReceber += Math.max(0, saldo);
        acc.totalGeral += total;
        
        return acc;
      },
      { recebido: 0, aReceber: 0, totalGeral: 0 }
    );
  }, [orcamentosFiltradosPeriodo]);

  // Dados para o gráfico (Evolução 12 meses OU Dias do mês)
  const chartData = useMemo(() => {
    if (!mounted) return [];
    
    if (selectedPeriod === 'all') {
      const months: ChartDataItem[] = [];
      const now = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(now, i);
        months.push({
          label: formatDate(d, 'MMM/yy', { locale: ptBR }),
          recebido: 0,
          aReceber: 0,
          timestamp: startOfMonth(d)
        });
      }

      orcamentosBase.forEach(orc => {
        const dataOrc = parseISO(orc.dataCriacao);
        const total = orc.totalVenda || 0;
        const pago = orc.valorPago || 0;
        const saldo = Math.max(0, total - pago);

        const monthIndex = months.findIndex(m => 
          isWithinInterval(dataOrc, { 
            start: m.timestamp, 
            end: endOfMonth(m.timestamp) 
          })
        );

        if (monthIndex !== -1) {
          months[monthIndex].recebido += pago;
          months[monthIndex].aReceber += saldo;
        }
      });
      return months;
    } else {
      // Evolução DIÁRIA do mês selecionado
      const [year, month] = selectedPeriod.split('-').map(Number);
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(start);
      const days = eachDayOfInterval({ start, end });
      
      const data: ChartDataItem[] = days.map(d => ({
        label: formatDate(d, 'dd'),
        recebido: 0,
        aReceber: 0,
        timestamp: startOfDay(d)
      }));

      orcamentosBase.forEach(orc => {
        const dataOrc = parseISO(orc.dataCriacao);
        if (formatDate(dataOrc, 'yyyy-MM') === selectedPeriod) {
           const dayIndex = dataOrc.getDate() - 1;
           if (data[dayIndex]) {
              data[dayIndex].recebido += orc.valorPago || 0;
              data[dayIndex].aReceber += Math.max(0, (orc.totalVenda || 0) - (orc.valorPago || 0));
           }
        }
      });
      return data;
    }
  }, [orcamentosBase, mounted, selectedPeriod]);

  if (!mounted || loadingAuth) {
    return (
      <div className="container mx-auto p-6 flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedPeriodLabel = periodOptions.find(o => o.value === selectedPeriod)?.label;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="text-primary h-6 w-6" />
            Financeiro
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Controle de entradas, saldos a receber e projeções de faturamento.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
           <CalendarDays className="text-muted-foreground h-4 w-4 hidden sm:block" />
           <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="capitalize">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
           </Select>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 uppercase font-bold text-[10px] tracking-wider">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Total Recebido
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl text-green-600 truncate">
              {formatCurrency(totais.recebido)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] text-muted-foreground">
              {selectedPeriod === 'all' ? 'Dinheiro já em conta' : `Recebido em ${selectedPeriodLabel}`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 uppercase font-bold text-[10px] tracking-wider">
              <Clock className="h-3 w-3 text-amber-500" /> A Receber
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl text-amber-600 truncate">
              {formatCurrency(totais.aReceber)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] text-muted-foreground">Saldos pendentes no período</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 uppercase font-bold text-[10px] tracking-wider">
              <TrendingUp className="h-3 w-3 text-primary" /> Projeção Total
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl text-primary truncate">
              {formatCurrency(totais.totalGeral)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <p className="text-[10px] text-muted-foreground">Soma de todos os contratos ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICO DE EVOLUÇÃO */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-md">
                <BarChart3 className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">
                  {selectedPeriod === 'all' ? 'Evolução dos Últimos 12 Meses' : `Evolução Diária - ${selectedPeriodLabel}`}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedPeriod === 'all' 
                    ? 'Recebimentos e saldos pendentes por mês.' 
                    : 'Acompanhamento diário das vendas e recebimentos do mês.'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-1 sm:p-6 pt-0">
          <div className="h-[280px] sm:h-[350px] w-full pt-4">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="label" 
                    tickLine={false} 
                    tickMargin={10} 
                    axisLine={false}
                    className="text-[9px] sm:text-[10px] font-medium"
                    interval={selectedPeriod === 'all' ? 0 : 2}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `R$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                    className="text-[9px] sm:text-[10px] font-medium"
                  />
                  <ChartTooltip 
                    cursor={{fill: 'var(--muted)', opacity: 0.2}}
                    content={<ChartTooltipContent 
                      formatter={(value) => formatCurrency(Number(value))}
                    />} 
                  />
                  <Bar 
                    dataKey="recebido" 
                    fill="var(--color-recebido)" 
                    stackId="a" 
                    radius={[0, 0, 0, 0]}
                    barSize={selectedPeriod === 'all' ? 25 : 8}
                  />
                  <Bar 
                    dataKey="aReceber" 
                    fill="var(--color-aReceber)" 
                    stackId="a" 
                    radius={[4, 4, 0, 0]}
                    barSize={selectedPeriod === 'all' ? 25 : 8}
                  />
                  <ChartLegend content={<ChartLegendContent className="text-[10px] sm:text-xs" />} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* DICAS FINANCEIRAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Lightbulb className="text-amber-500 h-4 w-4 sm:h-5 sm:w-5" />
              Dicas de Gestão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="flex gap-3">
              <div className="mt-0.5 bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full h-fit shrink-0">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-sm">Peça sempre um Sinal</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Solicitar 50% de entrada garante a compra dos materiais e cobre seus custos iniciais, além de firmar o compromisso do cliente.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full h-fit shrink-0">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-sm">Mantenha os Status em Dia</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Atualize orçamentos para 'Aceito' ou 'Concluído' assim que ocorrer a mudança. Isso mantém sua projeção financeira sempre real.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <PiggyBank className="text-green-500 h-4 w-4 sm:h-5 sm:w-5" />
              Saúde do seu Negócio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="flex gap-3">
              <div className="mt-0.5 bg-green-100 dark:bg-green-900/30 p-2 rounded-full h-fit shrink-0">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-sm">Planeje seu Fluxo de Caixa</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use o valor 'A Receber' para planejar o pagamento de fornecedores e evitar retiradas maiores do que o seu lucro real.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full h-fit shrink-0">
                <PiggyBank className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-sm">Reserva de Emergência</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tente separar 10% de cada serviço recebido para cobrir manutenções de ferramentas ou períodos com menos serviços.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
