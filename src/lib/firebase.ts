import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { 
  getFirestore, 
  type Firestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "COLE_A_NOVA_CHAVE_API_AQUI",
  authDomain: "COLE_O_NOVO_AUTH_DOMAIN_AQUI",
  projectId: "COLE_O_NOVO_PROJECT_ID_AQUI",
  storageBucket: "COLE_O_NOVO_STORAGE_BUCKET_AQUI",
  messagingSenderId: "COLE_O_NOVO_MESSAGING_SENDER_ID_AQUI",
  appId: "COLE_O_NOVO_APP_ID_AQUI"
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
