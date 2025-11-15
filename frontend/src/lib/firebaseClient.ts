import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as
    | string
    | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env
    .VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env
    .VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as
    | string
    | undefined,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    [
      "Firebase environment variables are missing.",
      "Create a `.env.local` with VITE_FIREBASE_* keys (see README).",
    ].join(" ")
  );
}

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8787/functions/v1";

function createFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApps()[0]!;
  }
  return initializeApp(firebaseConfig);
}

export const firebaseApp = createFirebaseApp();
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

export const backendConnectionInfo = {
  mode: import.meta.env.MODE,
  projectId: firebaseConfig.projectId ?? null,
  apiBaseUrl,
  storageBucket: firebaseConfig.storageBucket ?? null,
  generatedAt: new Date().toISOString(),
};

export function getFunctionsBaseUrl(): string {
  return apiBaseUrl.replace(/\/$/, "");
}
