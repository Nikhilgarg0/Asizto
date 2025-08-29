import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  // PASTE YOUR CONFIG OBJECT HERE
  apiKey: "AIzaSyDpxQ74ubA0AiyRK0JG_15ANpQ71fj5pc0",
  authDomain: "asizto-d0ced.firebaseapp.com",
  projectId: "asizto-d0ced",
  storageBucket: "asizto-d0ced.firebasestorage.app",
  messagingSenderId: "313042070399",
  appId: "1:313042070399:web:97ae79f578689a70f6084a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };