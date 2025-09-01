import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth, 
  getReactNativePersistence 
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDpxQ74ubA0AiyRK0JG_15ANpQ71fj5pc0",
  authDomain: "asizto-d0ced.firebaseapp.com",
  projectId: "asizto-d0ced",
  storageBucket: "asizto-d0ced.appspot.com", // ✅ fixed storage bucket
  messagingSenderId: "313042070399",
  appId: "1:313042070399:web:97ae79f578689a70f6084a"
};

// ✅ Initialize Firebase only once
const app = initializeApp(firebaseConfig);

// ✅ Initialize Auth with persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  auth = getAuth(app); // fallback if already initialized
}

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
