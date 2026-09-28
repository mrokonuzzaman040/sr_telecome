// Client-side Firebase Configuration for SR Telecom & Library POS
// Project: boighor-pos

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDIqKY6WEcUtY3NRroZgSA0ynZS2bErAtc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "boighor-pos.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "boighor-pos",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "boighor-pos.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "353037722643",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:353037722643:web:5010f96768006ddc138be6",
};
