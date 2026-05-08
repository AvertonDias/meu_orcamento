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
  Search, 
  Loader2,
  BarChart3,
  Lightbulb,
  ShieldCheck,
  PiggyBank,
  Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const orcamentosRaw = useLiveQuery(
    () => (user ? db.orcamentos.where('userId').equals(user.uid).toArray() : []),
    [user]
  );

  const orcamentos = useMemo(() => {
    if (!orcamentosRaw) return [];
    return orcamentosRaw.map(o => o.data).filter(o => o.status !== 'Recusado');
  }, [orcamentosRaw]);

  // Cálculos financeiros totais
  const totais = useMemo(() => {
    return orcamentos.reduce(
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
  }, [orcamentos]);

  // Filtragem para o gráfico
  const orcamentosFiltrados = useMemo(() => {
    if (!searchTerm) return orcamentos;
    const s = searchTerm.toLowerCase();
    return orcamentos.filter(
      o =>
        o.cliente.nome.toLowerCase().includes(s) ||
        o.numeroOrcamento.toLowerCase().includes(s)
    );
  }, [orcamentos, searchTerm]);

  // Dados para o gráfico de 12 meses
  const chartData = useMemo(() => {
    if (!mounted) return [];
    
    const months = [];
    const now = new Date();
    
    // Gera os últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({
        month: formatDate(d, 'MMM/yy', { locale: ptBR }),
        recebido: 0,
        aReceber: 0,
        timestamp: startOfMonth(d)
      });
    }

    // Distribui os orçamentos nos meses
    orcamentosFiltrados.forEach(orc => {
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
  }, [orcamentosFiltrados, mounted]);

  if (!mounted || loadingAuth) {
    return (
      <div className="container mx-auto p-6 flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="text-primary" />
          Financeiro
        </h1>
        <p className="text-muted-foreground text-sm">
          Controle de entradas, saldos a receber e projeções de faturamento.
        </p>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1 uppercase font-bold text-[10px]">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Total Recebido
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(totais.recebido)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">Dinheiro já em conta</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1 uppercase font-bold text-[10px]">
              <Clock className="h-3 w-3 text-amber-500" /> A Receber
            </CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {formatCurrency(totais.aReceber)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">Saldos pendentes de orçamentos</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1 uppercase font-bold text-[10px]">
              <TrendingUp className="h-3 w-3 text-primary" /> Projeção Total
            </CardDescription>
            <CardTitle className="text-2xl text-primary">
              {formatCurrency(totais.totalGeral)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">Soma de todos os contratos ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICO DE 12 MESES */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-primary h-5 w-5" />
              <div>
                <CardTitle>Histórico de 12 Meses</CardTitle>
                <CardDescription>Recebimentos e saldos pendentes por mês.</CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por cliente..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full pt-4">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    tickMargin={10} 
                    axisLine={false}
                    className="text-[10px] font-medium"
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                    className="text-[10px] font-medium"
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value) => formatCurrency(Number(value))}
                    />} 
                  />
                  <Bar 
                    dataKey="recebido" 
                    fill="var(--color-recebido)" 
                    stackId="a" 
                    radius={[0, 0, 0, 0]}
                    barSize={30}
                  />
                  <Bar 
                    dataKey="aReceber" 
                    fill="var(--color-aReceber)" 
                    stackId="a" 
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* DICAS FINANCEIRAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="text-amber-500 h-5 w-5" />
              Dicas de Gestão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="mt-1 bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full h-fit">
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
              <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full h-fit">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-sm">Mantenha os Status em Dia</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Atualize orçamentos para 'Aceito' ou 'Concluído' assim que ocorrer a mudança. Isso mantém sua projeção financeira (A Receber) sempre real.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PiggyBank className="text-green-500 h-5 w-5" />
              Saúde do seu Negócio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="mt-1 bg-green-100 dark:bg-green-900/30 p-2 rounded-full h-fit">
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
              <div className="mt-1 bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full h-fit">
                <PiggyBank className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-sm">Reserva de Emergência</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tente separar 10% de cada serviço recebido em uma conta separada para cobrir manutenções de ferramentas ou períodos com menos serviços.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
