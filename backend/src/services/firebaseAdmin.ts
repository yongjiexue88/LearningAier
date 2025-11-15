import admin, { ServiceAccount } from "firebase-admin";
import { runtimeConfig } from "../config/runtime";

function buildCredential(): admin.credential.Credential | null {
  if (runtimeConfig.firebaseCredentialJson) {
    try {
      const parsed = JSON.parse(runtimeConfig.firebaseCredentialJson) as ServiceAccount;
      return admin.credential.cert(parsed);
    } catch (error) {
      console.warn("[Firebase] Failed to parse FIREBASE_CREDENTIAL_JSON", error);
    }
  }

  if (runtimeConfig.firebaseClientEmail && runtimeConfig.firebasePrivateKey) {
    return admin.credential.cert({
      projectId: runtimeConfig.firebaseProjectId || undefined,
      clientEmail: runtimeConfig.firebaseClientEmail,
      privateKey: runtimeConfig.firebasePrivateKey.replace(/\\n/g, "\n"),
    });
  }

  try {
    return admin.credential.applicationDefault();
  } catch (error) {
    console.error(
      "[Firebase] Unable to load default credentials. Provide FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY or FIREBASE_CREDENTIAL_JSON."
    );
    throw error;
  }
}

const credential = buildCredential();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: credential ?? undefined,
    projectId: runtimeConfig.firebaseProjectId || undefined,
    storageBucket: runtimeConfig.firebaseStorageBucket,
  });
}

export const firebaseApp = admin.app();
export const firestore = admin.firestore(firebaseApp);
firestore.settings({ ignoreUndefinedProperties: true });
export const firebaseStorage = admin.storage(firebaseApp);
