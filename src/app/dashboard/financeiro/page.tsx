'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { Orcamento } from '@/lib/types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Banknote, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Search, 
  FilterX,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

  // Cálculos financeiros
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

  const orcamentosFiltrados = useMemo(() => {
    if (!searchTerm) return orcamentos;
    const s = searchTerm.toLowerCase();
    return orcamentos.filter(
      o =>
        o.cliente.nome.toLowerCase().includes(s) ||
        o.numeroOrcamento.toLowerCase().includes(s)
    );
  }, [orcamentos, searchTerm]);

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

      {/* LISTA DETALHADA */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Detalhamento por Orçamento</CardTitle>
              <CardDescription>Acompanhe o status de pagamento de cada cliente.</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orcamentosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Wallet className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p>Nenhum registro financeiro encontrado.</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Cliente / Orçamento</TableHead>
                    <TableHead className="text-right">Vl. Total</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="w-[150px]">Progresso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orcamentosFiltrados.map((orc) => {
                    const total = orc.totalVenda || 0;
                    const pago = orc.valorPago || 0;
                    const saldo = total - pago;
                    const porcentagem = total > 0 ? (pago / total) * 100 : 0;
                    const quitado = pago >= total && total > 0;

                    return (
                      <TableRow key={orc.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-primary">{orc.cliente.nome}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Nº {orc.numeroOrcamento} • {orc.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(total)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(pago)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${quitado ? 'text-muted-foreground' : 'text-amber-600'}`}>
                          {quitado ? 'R$ 0,00' : formatCurrency(saldo)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>{Math.round(porcentagem)}%</span>
                              {quitado && <Badge variant="success" className="h-4 text-[8px] px-1 py-0">QUITADO</Badge>}
                            </div>
                            <Progress value={porcentagem} className="h-1.5" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DICAS FINANCEIRAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ArrowUpRight className="text-green-500" /> Dica de Fluxo de Caixa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sempre que possível, solicite um sinal de 30% a 50% no momento do aceite para cobrir os custos de materiais e garantir o compromisso do cliente.
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ArrowDownRight className="text-amber-500" /> Cobrança Ativa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Orçamentos concluídos mas não quitados (saldo &gt; 0) devem ser sua prioridade de contato. Envie o QR Code Pix pelo WhatsApp para facilitar o pagamento.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
