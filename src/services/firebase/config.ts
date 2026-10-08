/**
 * @license
 * SENA Learning Hub - Firebase Client Initialization
 *
 * Configuración oficial y vinculada a:
 * Project ID: sena-learning-hub
 * Firestore Database ID: (default)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  memoryLocalCache,
  setLogLevel,
} from 'firebase/firestore';
import appletConfig from '../../../firebase-applet-config.json';

// Silenciar logs de advertencia de conexión offline interna de Firestore en entornos sandbox / dev
try {
  setLogLevel('silent');
} catch {
  // Ignorar si el ambiente no lo soporta
}

// Extraer credenciales oficiales de variables de entorno o de firebase-applet-config.json para sena-learning-hub
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ((typeof process !== 'undefined' && process.env) as any || {});

const apiKey = (env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || '').trim();
const authDomain = (env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || 'sena-learning-hub.firebaseapp.com').trim();
const projectId = (env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || 'sena-learning-hub').trim();
const storageBucket = (env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || 'sena-learning-hub.firebasestorage.app').trim();
const messagingSenderId = (env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || '').trim();
const appId = (env.VITE_FIREBASE_APP_ID || appletConfig.appId || '').trim();

export const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

// Inicializar la aplicación Firebase con la configuración oficial de sena-learning-hub
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicializar Authentication para sena-learning-hub
export const auth = getAuth(app);

// Inicializar Firestore de forma robusta para entornos web / iframes (Cloud Run preview)
// Utiliza memoryLocalCache para evitar bloqueos si la conexión externa es inestable
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  });
} catch {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;


