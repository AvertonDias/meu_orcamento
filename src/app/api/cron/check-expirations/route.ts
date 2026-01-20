
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps, getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { addDays, differenceInHours, isPast, parseISO, endOfDay } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import type { Orcamento, EmpresaData } from '@/lib/types';

// Função para inicializar o Firebase Admin de forma segura
const initializeFirebaseAdmin = () => {
  // Se já existe uma instância, use-a
  if (getApps().length > 0) {
    return getApp();
  }
  // Se não, inicialize uma nova
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error: any) {
    // Loga o erro, mas não quebra a aplicação se já existir
    if (!/already exists/.test(error.message)) {
      console.error('Firebase Admin initialization error', error.stack);
    }
    // Retorna a app existente em caso de erro de inicialização concorrente
    return getApp();
  }
};


export async function GET(request: NextRequest) {
  // Protege o endpoint para ser chamado apenas pelo Cloud Scheduler
  const schedulerToken = request.headers.get('Authorization')?.split('Bearer ')[1];
  // Esta verificação pode ser mais robusta, por exemplo, validando um ID token
  if (process.env.NODE_ENV === 'production' && schedulerToken !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  // A inicialização agora acontece DENTRO da função GET
  const app = initializeFirebaseAdmin();
  const db = getFirestore(app);
  const messaging = getMessaging(app);


  console.log('Verificando orçamentos prestes a vencer...');

  try {
    const orcamentosPendentesSnapshot = await db.collection('orcamentos').where('status', '==', 'Pendente').get();

    if (orcamentosPendentesSnapshot.empty) {
      console.log('Nenhum orçamento pendente encontrado.');
      return NextResponse.json({ success: true, message: 'Nenhum orçamento pendente.' });
    }

    const now = new Date();
    let notificationsSent = 0;

    for (const doc of orcamentosPendentesSnapshot.docs) {
      const orcamento = doc.data() as Orcamento;
      const validade = Number(orcamento.validadeDias);
      if (!validade) continue;

      const dataCriacao = parseISO(orcamento.dataCriacao);
      // A data de validade agora considera o final do dia
      const dataValidade = endOfDay(addDays(dataCriacao, validade));

      // Se já venceu, atualiza o status e pula
      if (isPast(dataValidade)) {
        await doc.ref.update({ status: 'Vencido' });
        continue;
      }
      
      // Se falta 24h ou menos para vencer E a notificação não foi enviada
      const horasParaVencer = differenceInHours(dataValidade, now);
      if (horasParaVencer > 0 && horasParaVencer <= 24 && !orcamento.notificacaoVencimentoEnviada) {
        const empresaDoc = await db.collection('empresa').doc(orcamento.userId).get();
        if (empresaDoc.exists) {
          const empresaData = empresaDoc.data() as EmpresaData;
          const fcmToken = empresaData.fcmToken;

          if (fcmToken) {
            const message = {
              token: fcmToken,
              notification: {
                title: 'Orçamento prestes a vencer!',
                body: `O orçamento Nº ${orcamento.numeroOrcamento} para ${orcamento.cliente.nome} (${formatCurrency(orcamento.totalVenda)}) está próximo de expirar.`
              },
              webpush: {
                fcmOptions: {
                  link: `/dashboard/orcamento?clienteId=${orcamento.cliente.id}`
                }
              }
            };
            
            await messaging.send(message);
            notificationsSent++;
          }
        }
        
        // Marca que a notificação foi enviada para não repetir
        await doc.ref.update({ notificacaoVencimentoEnviada: true });
      }
    }

    const message = `Verificação concluída. ${notificationsSent} notificações enviadas.`;
    console.log(message);
    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Erro ao verificar orçamentos:', error);
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 });
  }
}
