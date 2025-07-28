import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Looks up the user by email in Firestore and stores the userId in localStorage.
 * Call this after login, passing the authenticated user's email.
 * @param {string} email - The user's email address
 * @returns {Promise<string|null>} The userId if found, else null
 */
export async function storeUserIdByEmail(email) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const userDoc = querySnapshot.docs[0];
    localStorage.setItem('userId', userDoc.id);
    return userDoc.id;
  } else {
    localStorage.removeItem('userId');
    return null;
  }
}
