"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseStorage = exports.firestore = exports.firebaseApp = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const runtime_1 = require("../config/runtime");
function buildCredential() {
    if (runtime_1.runtimeConfig.firebaseCredentialJson) {
        try {
            const parsed = JSON.parse(runtime_1.runtimeConfig.firebaseCredentialJson);
            return firebase_admin_1.default.credential.cert(parsed);
        }
        catch (error) {
            console.warn("[Firebase] Failed to parse FIREBASE_CREDENTIAL_JSON", error);
        }
    }
    if (runtime_1.runtimeConfig.firebaseClientEmail && runtime_1.runtimeConfig.firebasePrivateKey) {
        return firebase_admin_1.default.credential.cert({
            projectId: runtime_1.runtimeConfig.firebaseProjectId || undefined,
            clientEmail: runtime_1.runtimeConfig.firebaseClientEmail,
            privateKey: runtime_1.runtimeConfig.firebasePrivateKey.replace(/\\n/g, "\n"),
        });
    }
    try {
        return firebase_admin_1.default.credential.applicationDefault();
    }
    catch (error) {
        console.error("[Firebase] Unable to load default credentials. Provide FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY or FIREBASE_CREDENTIAL_JSON.");
        throw error;
    }
}
const credential = buildCredential();
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp({
        credential: credential ?? undefined,
        projectId: runtime_1.runtimeConfig.firebaseProjectId || undefined,
        storageBucket: runtime_1.runtimeConfig.firebaseStorageBucket,
    });
}
exports.firebaseApp = firebase_admin_1.default.app();
exports.firestore = firebase_admin_1.default.firestore(exports.firebaseApp);
exports.firestore.settings({ ignoreUndefinedProperties: true });
exports.firebaseStorage = firebase_admin_1.default.storage(exports.firebaseApp);
