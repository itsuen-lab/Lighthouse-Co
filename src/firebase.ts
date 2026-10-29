/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCSXTFSvq9oGl_2jfBjZiDmSjrBn--TDug",
  authDomain: "lighthouse-3bb68.firebaseapp.com",
  projectId: "lighthouse-3bb68",
  storageBucket: "lighthouse-3bb68.firebasestorage.app",
  messagingSenderId: "524933538951",
  appId: "1:524933538951:web:302ef1a1608119dfdd4422",
  measurementId: "G-CCX4NG5XGL",
};

// Safe Firebase App and Firestore initialization
let appInstance: FirebaseApp;
let dbInstance: Firestore;

try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  dbInstance = getFirestore(appInstance);
} catch (error) {
  console.warn("Firebase initial setup caught (re-trying safely):", error);
  try {
    appInstance = initializeApp(firebaseConfig);
    dbInstance = getFirestore(appInstance);
  } catch (err2) {
    console.error("Firebase secondary initialization error:", err2);
  }
}

export const app = appInstance!;
export const db = dbInstance!;

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.warn(`[Firestore Safe Notice] Operation: ${operationType}, Path: ${path}, Details: ${errMsg}`);
}
