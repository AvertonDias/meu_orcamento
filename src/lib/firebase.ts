
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  type Firestore
} from "firebase/firestore";
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDiKZq6bOkazeGAbh-bpjePrOeT5EhPX_0",
  authDomain: "gutters-budget-pro.firebaseapp.com",
  projectId: "gutters-budget-pro",
  storageBucket: "gutters-budget-pro.appspot.com",
  messagingSenderId: "766057124102",
  appId: "1:766057124102:web:a8b2ed8d064964e4980e87"
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db: Firestore = getFirestore(app);

let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && 'Notification' in window) {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.error("Could not initialize messaging", e);
  }
}

export { app, auth, db, messaging };
