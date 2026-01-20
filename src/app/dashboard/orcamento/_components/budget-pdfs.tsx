
'use client';

import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from 'react';

import type { Orcamento, EmpresaData } from '@/lib/types';
import { addDays, format, parseISO } from 'date-fns';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';

import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { useToast } from '@/hooks/use-toast';
import { usePermissionDialog } from '@/hooks/use-permission-dialog';

/* =========================================================
   PDF CLIENTE
========================================================= */
const BudgetPDFLayout = ({
  orcamento,
  empresa,
}: {
  orcamento: Orcamento | null;
  empresa: EmpresaData | null;
}) => {
  if (!orcamento) return null;

  const dataCriacao = parseISO(orcamento.dataCriacao);
  const validadeDias = Number(orcamento.validadeDias);
  const dataValidade = !isNaN(validadeDias)
    ? addDays(dataCriacao, validadeDias)
    : null;

  const dataAceite = orcamento.dataAceite
    ? parseISO(orcamento.dataAceite)
    : null;

  const dataRecusa = orcamento.dataRecusa
    ? parseISO(orcamento.dataRecusa)
    : null;

  const telEmpresa =
    empresa?.telefones?.find(t => t.principal) ||
    empresa?.telefones?.[0];

  const telCliente =
    orcamento.cliente.telefones?.find(t => t.principal) ||
    orcamento.cliente.telefones?.[0];

  const subtotal = orcamento.itens.reduce(
    (acc, item) => acc + item.precoVenda,
    0
  );

  const ajuste = orcamento.totalVenda - subtotal;
  const totalEditado = Math.abs(subtotal - orcamento.totalVenda) > 0.01;

  return (
    <div className="p-8 bg-white text-black text-xs font-sans">
      {/* CABEÇALHO */}
      <header className="flex justify-between border-b-2 pb-4 mb-4">
        <div className="flex gap-4">
          {empresa?.logo && (
            <img
              src={empresa.logo}
              alt="Logo"
              className="w-20 h-20 object-contain"
            />
          )}
          <div>
            <h1 className="text-xl font-bold">{empresa?.nome}</h1>
            <p>{empresa?.endereco}</p>
            {telEmpresa && <p>{telEmpresa.numero}</p>}
            <p>{empresa?.cnpj}</p>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-lg font-semibold">
            Orçamento #{orcamento.numeroOrcamento}
          </h2>
          <p>Data: {format(dataCriacao, 'dd/MM/yyyy')}</p>

          {orcamento.status === 'Aceito' && dataAceite && (
            <p className="text-green-600 font-semibold">
              Aceito em {format(dataAceite, 'dd/MM/yyyy')}
            </p>
          )}

          {orcamento.status === 'Recusado' && dataRecusa && (
            <p className="text-red-600 font-semibold">
              Recusado em {format(dataRecusa, 'dd/MM/yyyy')}
            </p>
          )}

          {orcamento.status === 'Vencido' && dataValidade && (
            <p className="text-orange-600 font-semibold">
              Vencido em {format(dataValidade, 'dd/MM/yyyy')}
            </p>
          )}

          {orcamento.status === 'Pendente' && dataValidade && (
            <p>Validade: {format(dataValidade, 'dd/MM/yyyy')}</p>
          )}
        </div>
      </header>

      {/* CLIENTE */}
      <section className="mb-4">
        <h3 className="font-semibold text-base mb-2">Cliente</h3>
        <p><strong>Nome:</strong> {orcamento.cliente.nome}</p>
        {orcamento.cliente.cpfCnpj && <p><strong>CPF/CNPJ:</strong> {orcamento.cliente.cpfCnpj}</p>}
        {orcamento.cliente.endereco && <p><strong>Endereço:</strong> {orcamento.cliente.endereco}</p>}
        {telCliente && <p><strong>Telefone:</strong> {telCliente.numero}</p>}
        {orcamento.cliente.email && <p><strong>Email:</strong> {orcamento.cliente.email}</p>}
      </section>

      {/* TABELA */}
      <table className="w-full border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Descrição</th>
            <th className="p-2 text-right">Qtd</th>
            <th className="p-2 text-right">Unit</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {orcamento.itens.map(item => (
            <tr key={item.id} className="border-b even:bg-gray-50">
              <td className="p-2">{item.materialNome}</td>
              <td className="p-2 text-right">
                {formatNumber(item.quantidade, 2)} {item.unidade}
              </td>
              <td className="p-2 text-right">
                {formatCurrency(
                  item.quantidade > 0
                    ? item.precoVenda / item.quantidade
                    : 0
                )}
              </td>
              <td className="p-2 text-right font-medium">
                {formatCurrency(item.precoVenda)}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          {totalEditado && [
            <tr key="subtotal-pdf">
              <td colSpan={3} className="p-2 text-right">Subtotal</td>
              <td className="p-2 text-right">{formatCurrency(subtotal)}</td>
            </tr>,
            <tr key="ajuste-pdf">
              <td colSpan={3} className="p-2 text-right">
                {ajuste < 0 ? 'Desconto' : 'Acréscimo'}
              </td>
              <td className="p-2 text-right">
                {formatCurrency(ajuste)}
              </td>
            </tr>
          ]}
          <tr className="bg-gray-200 font-bold">
            <td colSpan={3} className="p-2 text-right">TOTAL</td>
            <td className="p-2 text-right">
              {formatCurrency(orcamento.totalVenda)}
            </td>
          </tr>
        </tfoot>
      </table>

      {orcamento.observacoes && (
        <section className="mt-4 border-t pt-4">
          <h3 className="font-semibold mb-2">Observações</h3>
          <p className="whitespace-pre-wrap">{orcamento.observacoes}</p>
        </section>
      )}
    </div>
  );
};

/* =========================================================
   PDF INTERNO
========================================================= */
const InternalBudgetPDFLayout = ({
  orcamento,
  empresa,
}: {
  orcamento: Orcamento | null;
  empresa: EmpresaData | null;
}) => {
  if (!orcamento) return null;

  const dataCriacao = parseISO(orcamento.dataCriacao);

  const totalCustoItens = orcamento.itens.reduce(
    (acc, item) => acc + item.total,
    0
  );
  
  const totalVendaCalculado = orcamento.itens.reduce(
    (acc, item) => acc + item.precoVenda,
    0
  );

  const lucroBruto = orcamento.totalVenda - totalCustoItens;
  
  const ajuste = orcamento.totalVenda - totalVendaCalculado;
  const totalEditado = Math.abs(totalVendaCalculado - orcamento.totalVenda) > 0.01;
  const telEmpresa =
    empresa?.telefones?.find(t => t.principal) ||
    empresa?.telefones?.[0];

  return (
    <div className="p-8 bg-white text-black text-xs font-sans">
      {/* CABEÇALHO */}
      <header className="flex justify-between border-b-2 pb-4 mb-4">
        <div className="flex gap-4">
          {empresa?.logo && (
            <img
              src={empresa.logo}
              alt="Logo"
              className="w-20 h-20 object-contain"
            />
          )}
          <div>
            <h1 className="text-xl font-bold">{empresa?.nome}</h1>
            <p>{empresa?.endereco}</p>
            {telEmpresa && <p>{telEmpresa.numero}</p>}
            <p>{empresa?.cnpj}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold">
            Relatório Interno - Orçamento #{orcamento.numeroOrcamento}
          </h2>
          <p>Cliente: {orcamento.cliente.nome}</p>
          <p>Data: {format(dataCriacao, 'dd/MM/yyyy')}</p>
        </div>
      </header>

      {/* TABELA DE CUSTOS */}
      <table className="w-full border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Item</th>
            <th className="p-2 text-right">Qtd</th>
            <th className="p-2 text-right">Custo Unit.</th>
            <th className="p-2 text-right">Custo Total</th>
            <th className="p-2 text-right">Margem %</th>
            <th className="p-2 text-right">Preço Venda</th>
          </tr>
        </thead>
        <tbody>
          {orcamento.itens.map(item => (
            <tr key={item.id} className="border-b even:bg-gray-50">
              <td className="p-2">{item.materialNome}</td>
              <td className="p-2 text-right">{formatNumber(item.quantidade, 2)}</td>
              <td className="p-2 text-right">{formatCurrency(item.precoUnitario)}</td>
              <td className="p-2 text-right">{formatCurrency(item.total)}</td>
              <td className="p-2 text-right">{formatNumber(item.margemLucro, 2)}%</td>
              <td className="p-2 text-right font-medium">{formatCurrency(item.precoVenda)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* RESUMO FINANCEIRO */}
      <section className="mt-4 pt-4 border-t flex justify-end">
        <div className="w-1/2 space-y-1">
          <div className="flex justify-between">
            <span>Custo Total dos Itens:</span>
            <span>{formatCurrency(totalCustoItens)}</span>
          </div>

          {totalEditado && (
             <>
              <div className="flex justify-between">
                <span>Total Venda (Calculado):</span>
                <span>{formatCurrency(totalVendaCalculado)}</span>
              </div>
               <div className="flex justify-between">
                <span>Ajuste Manual:</span>
                <span>{formatCurrency(ajuste)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between font-bold">
            <span>Total Venda (Final):</span>
            <span>{formatCurrency(orcamento.totalVenda)}</span>
          </div>

          <div className={cn(
              "flex justify-between font-bold pt-2 border-t",
              lucroBruto >= 0 ? 'text-green-700' : 'text-red-700'
            )}>
            <span>Lucro Bruto:</span>
            <span>{formatCurrency(lucroBruto)}</span>
          </div>
        </div>
      </section>

      {(orcamento.observacoes || orcamento.observacoesInternas) && (
        <section className="mt-4 border-t pt-4">
          <h3 className="font-semibold mb-2">Observações e Anotações</h3>
          {orcamento.observacoes && <p><strong>Obs. Cliente:</strong> {orcamento.observacoes}</p>}
          {orcamento.observacoesInternas && <p><strong>Obs. Internas:</strong> {orcamento.observacoesInternas}</p>}
        </section>
      )}
    </div>
  );
};


/* =========================================================
   COMPONENTE EXPORTÁVEL
========================================================= */
const BudgetPDFs = forwardRef(
  ({ empresa }: { empresa: EmpresaData | null }, ref) => {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [orcamentoAtual, setOrcamentoAtual] = useState<Orcamento | null>(null);
    const [pdfType, setPdfType] = useState<'client' | 'internal'>('client');


    const { toast } = useToast();
    const { requestPermission } = usePermissionDialog();

    const gerarPDF = async (orcamento: Orcamento, type: 'client' | 'internal') => {
      setOrcamentoAtual(orcamento);
      setPdfType(type);

      await new Promise(r => setTimeout(r, 120));

      if (!pdfRef.current) return;

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        backgroundColor: '#fff',
      });

      const pdf = new jsPDF('p', 'pt', 'a4');
      const imgData = canvas.toDataURL('image/png');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName = `orcamento-${orcamento.numeroOrcamento}-${type}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');

        const perm = await requestPermission({
          title: 'Permissão para Salvar Arquivo',
          description:
            'Para salvar o orçamento em PDF na pasta de Documentos do seu celular, o aplicativo precisa de permissão para acessar o armazenamento. Deseja permitir?',
        });

        if (!perm) {
          toast({ title: 'Permissão negada', variant: 'destructive' });
          return;
        }

        try {
          await Filesystem.writeFile({
            path: fileName,
            data: pdf.output('datauristring').split(',')[1],
            directory: Directory.Documents,
          });

          toast({ title: 'PDF salvo com sucesso!', description: `Salvo em Documentos/${fileName}` });

        } catch (e: any) {
            toast({ title: 'Erro ao salvar PDF', description: e?.message || 'Não foi possível salvar o arquivo.', variant: 'destructive' });
        }
        
      } else {
        pdf.save(fileName);
      }

      setOrcamentoAtual(null);
    };

    useImperativeHandle(ref, () => ({
      gerarPDF,
    }));

    return (
      <div className="absolute -left-[9999px] top-0">
        <div ref={pdfRef} className="w-[210mm]">
          {pdfType === 'client' ? (
            <BudgetPDFLayout orcamento={orcamentoAtual} empresa={empresa} />
          ) : (
            <InternalBudgetPDFLayout orcamento={orcamentoAtual} empresa={empresa} />
          )}
        </div>
      </div>
    );
  }
);

BudgetPDFs.displayName = 'BudgetPDFs';
export { BudgetPDFs };
