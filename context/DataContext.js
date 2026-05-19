/**
 * context/DataContext.js
 *
 * Single source of truth for all Firestore real-time data.
 * Owns exactly ONE onSnapshot listener per collection per authenticated user.
 * All screens consume shared data via useData() — zero duplicate reads.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { db, auth } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  // orderBy removed — appointments are sorted client-side to avoid composite index
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import logger from '../utils/Logger';

// ─── Context ─────────────────────────────────────────────────────────────────

const DataContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }) {
  const [userId, setUserId]                 = useState(null);

  // Data
  const [medicines, setMedicines]           = useState([]);
  const [appointments, setAppointments]     = useState([]);
  const [userProfile, setUserProfile]       = useState({});

  // Loading / error per collection
  const [loadingMeds, setLoadingMeds]       = useState(true);
  const [loadingAppts, setLoadingAppts]     = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorMeds, setErrorMeds]           = useState(null);
  const [errorAppts, setErrorAppts]         = useState(null);
  const [errorProfile, setErrorProfile]     = useState(null);

  // Keep unsub refs so we can teardown when user changes
  const unsubMedsRef    = useRef(null);
  const unsubApptsRef   = useRef(null);
  const unsubProfileRef = useRef(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const teardownListeners = useCallback(() => {
    if (unsubMedsRef.current)    { unsubMedsRef.current();    unsubMedsRef.current    = null; }
    if (unsubApptsRef.current)   { unsubApptsRef.current();   unsubApptsRef.current   = null; }
    if (unsubProfileRef.current) { unsubProfileRef.current(); unsubProfileRef.current = null; }
  }, []);

  const resetData = useCallback(() => {
    setMedicines([]);
    setAppointments([]);
    setUserProfile({});
    setLoadingMeds(true);
    setLoadingAppts(true);
    setLoadingProfile(true);
    setErrorMeds(null);
    setErrorAppts(null);
    setErrorProfile(null);
  }, []);

  const attachListeners = useCallback((uid) => {
    // ── User profile ────────────────────────────────────────────────────
    const profileRef = doc(db, 'users', uid);
    unsubProfileRef.current = onSnapshot(
      profileRef,
      (snap) => {
        try {
          setUserProfile(snap.exists() ? snap.data() : {});
        } catch (err) {
          logger.error('[DataContext] Profile processing error', err);
          setErrorProfile('Failed to load profile');
        } finally {
          setLoadingProfile(false);
        }
      },
      (err) => {
        logger.error('[DataContext] Profile listener error', err);
        setErrorProfile('Failed to load profile');
        setLoadingProfile(false);
      },
    );

    // ── Medicines ────────────────────────────────────────────────────────
    const medsQuery = query(
      collection(db, 'medicines'),
      where('userId', '==', uid),
    );
    unsubMedsRef.current = onSnapshot(
      medsQuery,
      (snap) => {
        try {
          setMedicines(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
          setErrorMeds(null);
        } catch (err) {
          logger.error('[DataContext] Medicines processing error', err);
          setErrorMeds('Failed to load medicines');
        } finally {
          setLoadingMeds(false);
        }
      },
      (err) => {
        logger.error('[DataContext] Medicines listener error', err);
        setErrorMeds('Failed to load medicines');
        setLoadingMeds(false);
      },
    );

    // ── Appointments ─────────────────────────────────────────────────────
    // Sort client-side by date asc — avoids needing a Firestore composite index
    // (userId + date compound query requires a manual index in Firebase console)
    const apptsQuery = query(
      collection(db, 'appointments'),
      where('userId', '==', uid),
    );
    unsubApptsRef.current = onSnapshot(
      apptsQuery,
      (snap) => {
        try {
          const sorted = snap.docs
            .map((d) => ({ ...d.data(), id: d.id }))
            .sort((a, b) => {
              // Firestore Timestamps have .seconds; JS Dates have .getTime()
              const aMs = a.date?.seconds ? a.date.seconds * 1000 : (a.date instanceof Date ? a.date.getTime() : 0);
              const bMs = b.date?.seconds ? b.date.seconds * 1000 : (b.date instanceof Date ? b.date.getTime() : 0);
              return aMs - bMs;
            });
          setAppointments(sorted);
          setErrorAppts(null);
        } catch (err) {
          logger.error('[DataContext] Appointments processing error', err);
          setErrorAppts('Failed to load appointments');
        } finally {
          setLoadingAppts(false);
        }
      },
      (err) => {
        logger.error('[DataContext] Appointments listener error', err);
        setErrorAppts('Failed to load appointments');
        setLoadingAppts(false);
      },
    );
  }, []);

  // ── Auth observer — drives listener lifecycle ─────────────────────────────

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      teardownListeners();
      if (user) {
        setUserId(user.uid);
        resetData();
        attachListeners(user.uid);
      } else {
        setUserId(null);
        resetData();
        // Mark everything as "not loading" for signed-out state
        setLoadingMeds(false);
        setLoadingAppts(false);
        setLoadingProfile(false);
      }
    });

    return () => {
      unsubAuth();
      teardownListeners();
    };
  }, [attachListeners, teardownListeners, resetData]);

  // ── Derived: overall loading flag ─────────────────────────────────────────

  const loading = loadingMeds || loadingAppts || loadingProfile;

  // ── refetch: tears down and re-attaches all listeners (used by pull-to-refresh) ──
  const refetch = useCallback(() => {
    if (!userId) return;
    teardownListeners();
    resetData();
    attachListeners(userId);
  }, [userId, teardownListeners, resetData, attachListeners]);

  // ── Context value ─────────────────────────────────────────────────────────

  const value = {
    // Auth
    userId,

    // Data
    medicines,
    appointments,
    userProfile,

    // Per-collection loading flags
    loadingMeds,
    loadingAppts,
    loadingProfile,

    // Convenience: true while any collection is still loading
    loading,

    // Per-collection errors
    errorMeds,
    errorAppts,
    errorProfile,

    // Convenience: first non-null error
    error: errorProfile || errorMeds || errorAppts || null,

    // PERF-3: real pull-to-refresh — re-subscribes all listeners
    refetch,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used inside <DataProvider>');
  }
  return ctx;
}
