
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { 
  getFirestore, 
  type Firestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
    throw new Error(`
================================================================================
Chave de API do Firebase (NEXT_PUBLIC_FIREBASE_API_KEY) não encontrada.
O aplicativo não pode se conectar ao Firebase sem ela.

**AÇÃO NECESSÁRIA:**

1. **Localmente (se estiver rodando no seu computador):**
   - Crie um arquivo chamado '.env.local' na raiz do projeto (se ainda não existir).
   - Adicione a seguinte linha a ele, substituindo 'SUA_CHAVE_AQUI' pela sua chave real:
     NEXT_PUBLIC_FIREBASE_API_KEY=SUA_CHAVE_AQUI

2. **Em Produção (Vercel, Netlify, etc.):**
   - Vá para as configurações do seu projeto no seu provedor de hospedagem.
   - Procure a seção "Environment Variables" (Variáveis de Ambiente).
   - Adicione a variável com o nome 'NEXT_PUBLIC_FIREBASE_API_KEY' e o valor da sua chave.

Você pode encontrar sua 'Chave de API da Web' no console do Firebase:
Configurações do Projeto -> Geral -> Seus apps -> App da Web.
================================================================================
    `);
}


const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
