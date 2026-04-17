import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { 
  getFirestore, 
  type Firestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "COLE_AQUI_O_VALOR_DO_SEU_apiKey",
  authDomain: "COLE_AQUI_O_VALOR_DO_SEU_authDomain",
  databaseURL: "COLE_AQUI_O_VALOR_DO_SEU_databaseURL",
  projectId: "COLE_AQUI_O_VALOR_DO_SEU_projectId",
  storageBucket: "COLE_AQUI_O_VALOR_DO_SEU_storageBucket",
  messagingSenderId: "COLE_AQUI_O_VALOR_DO_SEU_messagingSenderId",
  appId: "COLE_AQUI_O_VALOR_DO_SEU_appId"
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
