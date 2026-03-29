import { createContext, useContext, useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";

export const WishlistContext = createContext();

export function useWishlist() {
  return useContext(WishlistContext);
}

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]);   // array of productIds (strings)
  const [user, setUser] = useState(null);
  const unsubscribeSnapshotRef = useRef(null);

  /* ── Auth listener ── */
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Tear down previous snapshot if any
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }

      if (!currentUser) {
        setWishlist([]);
        return;
      }

      // Subscribe to this user's wishlist doc with onSnapshot (real-time + cross-device)
      const wishlistRef = doc(db, "wishlists", currentUser.uid);
      const unsubscribe = onSnapshot(wishlistRef, (snap) => {
        if (snap.exists()) {
          setWishlist(snap.data().productIds || []);
        } else {
          setWishlist([]);
        }
      });

      unsubscribeSnapshotRef.current = unsubscribe;
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
    };
  }, []);

  /* ── Toggle product in/out of wishlist ── */
  const toggleWishlist = async (productId) => {
    if (!user) return false; // caller can redirect to login

    const wishlistRef = doc(db, "wishlists", user.uid);
    const isIn = wishlist.includes(productId);

    try {
      const snap = await getDoc(wishlistRef);
      if (!snap.exists()) {
        // First time — create the doc
        await setDoc(wishlistRef, {
          userId: user.uid,
          productIds: isIn ? [] : [productId],
        });
      } else {
        await updateDoc(wishlistRef, {
          productIds: isIn ? arrayRemove(productId) : arrayUnion(productId),
        });
      }
      // onSnapshot will update local state automatically
      return !isIn; // return new state (true = added)
    } catch (err) {
      console.error("Wishlist toggle error:", err);
      return isIn; // unchanged on error
    }
  };

  /* ── Helper ── */
  const isWishlisted = (productId) => wishlist.includes(productId);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted, user }}>
      {children}
    </WishlistContext.Provider>
  );
}