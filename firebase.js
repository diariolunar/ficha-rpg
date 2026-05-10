import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA4-Sxx_Wfcy7HsWjjqYAafd4lcUTH97Yk",
  authDomain: "ficha-rpg-f461c.firebaseapp.com",
  projectId: "ficha-rpg-f461c",
  storageBucket: "ficha-rpg-f461c.firebasestorage.app",
  messagingSenderId: "1080579521122",
  appId: "1:1080579521122:web:2f29df980dca13e3c5af3b",
  measurementId: "G-SN1F7W74SN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
};
