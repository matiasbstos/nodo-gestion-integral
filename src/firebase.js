import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: "nodo-aps-cl",
  appId: "1:776530735706:web:d2f78ca38bd1899c78de63",
  storageBucket: "nodo-aps-cl.firebasestorage.app",
  apiKey: "AIzaSyBsTEYhdfczmm2OVUg8CtbFYCAfJp6ye_4",
  authDomain: "nodo-aps-cl.firebaseapp.com",
  messagingSenderId: "776530735706"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

