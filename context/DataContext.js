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
  orderBy,
  limit,
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

  // Pagination states for medicines
  const [medsLimit, setMedsLimit]           = useState(50);
  const [hasMoreMeds, setHasMoreMeds]       = useState(false);

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
    setMedsLimit(50);
    setHasMoreMeds(false);
  }, []);

  const attachProfileListener = useCallback((uid) => {
    if (unsubProfileRef.current) return;
    const profileRef = doc(db, 'users', uid);
    unsubProfileRef.current = onSnapshot(
      profileRef,
      (snap) => {
        try {
          setUserProfile(snap.exists() ? snap.data() : {});
          setErrorProfile(null);
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
  }, []);

  const attachAppointmentsListener = useCallback((uid) => {
    if (unsubApptsRef.current) return;
    const apptsQuery = query(
      collection(db, 'appointments'),
      where('userId', '==', uid)
    );
    unsubApptsRef.current = onSnapshot(
      apptsQuery,
      (snap) => {
        try {
          const appts = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          appts.sort((a, b) => {
            const parseDate = (val) => {
              if (!val) return new Date(0);
              if (typeof val.toDate === 'function') return val.toDate();
              if (val instanceof Date) return val;
              return new Date(val);
            };
            return parseDate(a.date) - parseDate(b.date);
          });
          setAppointments(appts);
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

  const attachMedicinesListener = useCallback((uid, limitCount) => {
    if (unsubMedsRef.current) {
      unsubMedsRef.current();
      unsubMedsRef.current = null;
    }
    setLoadingMeds(true);
    const medsQuery = query(
      collection(db, 'medicines'),
      where('userId', '==', uid),
      limit(limitCount)
    );
    unsubMedsRef.current = onSnapshot(
      medsQuery,
      (snap) => {
        try {
          const meds = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          setMedicines(meds);
          setHasMoreMeds(snap.docs.length === limitCount);
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
  }, []);

  // ── Auth observer — drives user state ─────────────────────────────

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        teardownListeners();
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
  }, [teardownListeners, resetData]);

  // ── Sync listeners based on userId & limit ───────────────────────

  useEffect(() => {
    if (userId) {
      attachProfileListener(userId);
      attachAppointmentsListener(userId);
    }
  }, [userId, attachProfileListener, attachAppointmentsListener]);

  useEffect(() => {
    if (userId) {
      attachMedicinesListener(userId, medsLimit);
    }
  }, [userId, medsLimit, attachMedicinesListener]);

  // ── Derived: overall loading flag ─────────────────────────────────────────

  const loading = loadingMeds || loadingAppts || loadingProfile;

  // ── Pagination triggers ──────────────────────────────────────────────────
  const loadMoreMeds = useCallback(() => {
    if (hasMoreMeds && !loadingMeds) {
      setMedsLimit((prev) => prev + 50);
    }
  }, [hasMoreMeds, loadingMeds]);

  // ── refetch: tears down and re-attaches all listeners (used by pull-to-refresh) ──
  const refetch = useCallback(() => {
    if (!userId) return;
    teardownListeners();
    resetData();
    attachProfileListener(userId);
    attachAppointmentsListener(userId);
    attachMedicinesListener(userId, 50);
  }, [userId, teardownListeners, resetData, attachProfileListener, attachAppointmentsListener, attachMedicinesListener]);

  // ── Context value ─────────────────────────────────────────────────────────

  const value = {
    // Auth
    userId,

    // Data
    medicines,
    appointments,
    userProfile,

    // Pagination flags
    hasMoreMeds,
    loadMoreMeds,

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

    // pull-to-refresh — re-subscribes all listeners
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
