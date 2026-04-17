import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { 
  getFirestore, 
  type Firestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiKZq6bOkazeGAbh-bpjePrOeT5EhPX_0",
  authDomain: "gutters-budget-pro.firebaseapp.com",
  databaseURL: "https://gutters-budget-pro-default-rtdb.firebaseio.com",
  projectId: "gutters-budget-pro",
  storageBucket: "gutters-budget-pro.firebasestorage.app",
  messagingSenderId: "766057124102",
  appId: "1:766057124102:web:a8b2ed8d064964e4980e87"
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
