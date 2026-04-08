import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
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
  serverTimestamp,
} from "firebase/firestore";

export const WishlistContext = createContext();

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]);        // array of product IDs
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  const unsubscribeSnapshotRef = useRef(null);
  const unsubscribeAuthRef = useRef(null);

  /* ── Auth state listener + Real-time wishlist sync ── */
  useEffect(() => {
    unsubscribeAuthRef.current = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      // Clean up previous listener
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }

      if (!currentUser) {
        setWishlist([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const wishlistRef = doc(db, "wishlists", currentUser.uid);

      // Real-time listener
      unsubscribeSnapshotRef.current = onSnapshot(
        wishlistRef,
        (snap) => {
          if (snap.exists()) {
            setWishlist(snap.data().productIds || []);
          } else {
            setWishlist([]);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Wishlist snapshot error:", error);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeAuthRef.current) unsubscribeAuthRef.current();
      if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
    };
  }, []);

  /* ── Toggle wishlist with optimistic update ── */
  const toggleWishlist = useCallback(async (productId) => {
    if (!user) {
      // You can return a specific value or throw to trigger login modal
      return { success: false, message: "Please log in to save items" };
    }

    const wishlistRef = doc(db, "wishlists", user.uid);
    const isCurrentlyWishlisted = wishlist.includes(productId);

    // Optimistic update for instant UI response
    const newWishlist = isCurrentlyWishlisted
      ? wishlist.filter((id) => id !== productId)
      : [...wishlist, productId];

    setWishlist(newWishlist);

    try {
      const snap = await getDoc(wishlistRef);

      if (!snap.exists()) {
        await setDoc(wishlistRef, {
          userId: user.uid,
          productIds: [productId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(wishlistRef, {
          productIds: isCurrentlyWishlisted 
            ? arrayRemove(productId) 
            : arrayUnion(productId),
          updatedAt: serverTimestamp(),
        });
      }

      return {
        success: true,
        added: !isCurrentlyWishlisted,
        message: !isCurrentlyWishlisted 
          ? "Added to wishlist" 
          : "Removed from wishlist",
      };
    } catch (err) {
      console.error("Wishlist toggle failed:", err);
      
      // Revert optimistic update on error
      setWishlist(wishlist);
      
      return {
        success: false,
        message: "Failed to update wishlist. Please try again.",
      };
    }
  }, [user, wishlist]);

  /* ── Helpers ── */
  const isWishlisted = useCallback((productId) => 
    wishlist.includes(productId), [wishlist]);

  const clearWishlist = useCallback(async () => {
    if (!user) return;
    const wishlistRef = doc(db, "wishlists", user.uid);
    try {
      await setDoc(wishlistRef, { 
        userId: user.uid, 
        productIds: [],
        updatedAt: serverTimestamp() 
      });
    } catch (err) {
      console.error("Failed to clear wishlist:", err);
    }
  }, [user]);

  const value = {
    wishlist,
    loading,
    user,
    toggleWishlist,
    isWishlisted,
    clearWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

