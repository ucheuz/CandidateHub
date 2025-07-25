import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDu3vqmyqkF7zCqr-5QtBrJPjQju4H0Q1A",
  authDomain: "candidatehub-b4722.firebaseapp.com",
  projectId: "candidatehub-b4722",
  storageBucket: "candidatehub-b4722.appspot.com",
  messagingSenderId: "345987650922",
  appId: "1:345987650922:web:d8f4c9b8e6a9d4f3e2b1a0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, getFirestore, collection, query, where, getDocs };
