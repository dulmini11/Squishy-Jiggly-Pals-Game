'use client'
// Firebase sign-in for the owner (email + password). Only used when Firebase is configured.
import { firebaseConfig } from './data'

export async function initFirebase() {
  const { getApps, initializeApp } = await import('firebase/app')
  if (!getApps().length) initializeApp(firebaseConfig)
  const auth = await import('firebase/auth')
  return { auth, a: auth.getAuth() }
}

export async function signIn(email: string, password: string) {
  const { auth, a } = await initFirebase()
  return auth.signInWithEmailAndPassword(a, email, password)
}

export async function signOut() {
  const { auth, a } = await initFirebase()
  return auth.signOut(a)
}

export async function watchUser(cb: (email: string | null) => void) {
  const { auth, a } = await initFirebase()
  return auth.onAuthStateChanged(a, (u) => cb(u?.email ?? null))
}
