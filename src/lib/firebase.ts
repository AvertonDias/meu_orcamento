import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { 
  getFirestore, 
  type Firestore
} from "firebase/firestore";

// ATENÇÃO: A chave de API (apiKey) abaixo está suspensa e precisa ser substituída.
// 1. Vá para o seu projeto no Firebase Console.
// 2. Vá para Configurações do Projeto > Geral.
// 3. Na seção "Seus apps", encontre seu app da web e copie o objeto de configuração (firebaseConfig).
// 4. Cole os novos valores aqui para reativar a autenticação.
const firebaseConfig = {
  apiKey: "AIzaSyD6_76wl1KD1-nFgIWQMBh14QYMN8O_XNs",
  authDomain: "gutters-budget-pro.firebaseapp.com",
  databaseURL: "https://gutters-budget-pro-default-rtdb.firebaseio.com",
  projectId: "gutters-budget-pro",
  storageBucket: "gutters-budget-pro.firebasestorage.app",
  messagingSenderId: "766057124102",
  appId: "1:766057124102:web:2aa9df964f2a1976980e87"
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
