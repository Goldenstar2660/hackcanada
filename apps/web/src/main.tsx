import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

import { DashboardBrowserApplication } from "./app/providers.js";
import "./app/dashboard.css";

interface BrowserEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
}

function requireEnv(name: keyof BrowserEnv): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required dashboard environment variable: ${name}.`);
  }

  return value;
}

const firebaseApp = initializeApp({
  apiKey: requireEnv("VITE_FIREBASE_API_KEY"),
  appId: requireEnv("VITE_FIREBASE_APP_ID"),
  authDomain: requireEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requireEnv("VITE_FIREBASE_PROJECT_ID"),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
});

const services = {
  auth: getAuth(firebaseApp),
  firestore: getFirestore(firebaseApp),
  functions: getFunctions(firebaseApp, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || undefined)
};

const container = document.getElementById("root");
if (!container) {
  throw new Error("Dashboard root element not found.");
}

createRoot(container).render(
  <StrictMode>
    <DashboardBrowserApplication services={services} initialPath={`${window.location.pathname}${window.location.search}`} />
  </StrictMode>
);