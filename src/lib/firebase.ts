import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export async function signInWithGooglePopup() {
  const result = await signInWithPopup(auth, googleAuthProvider);
  const token = await result.user.getIdToken();
  return { user: result.user, token };
}

export async function signOutUser() {
  await signOut(auth);
}
