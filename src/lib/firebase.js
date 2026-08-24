import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// .env が未設定でもアプリ自体はゲストモードで動作できるようにする
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = isFirebaseConfigured && getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const firebaseAuth = isFirebaseConfigured ? getAuth(app) : null

export function watchAuthState(callback) {
  if (!isFirebaseConfigured) return () => {}
  return onAuthStateChanged(firebaseAuth, (user) => callback(user))
}

export async function signIn(email, password) {
  await signInWithEmailAndPassword(firebaseAuth, email, password)
}

export async function signUp(email, password) {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password)
  return cred.user
}

export async function signOutUser() {
  await firebaseSignOut(firebaseAuth)
}

export async function setFirebaseDisplayName(name) {
  if (firebaseAuth.currentUser) {
    await updateProfile(firebaseAuth.currentUser, { displayName: name })
  }
}
