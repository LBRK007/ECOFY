import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Navigate } from "react-router-dom";

/*
  FIX: auth.currentUser is always null on initial render (race condition).
  Using onAuthStateChanged ensures we wait for Firebase to restore the
  persisted session before making an authorization decision.
*/
function ProtectedRoute({ children, adminOnly }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setAuthorized(false);
        } else {
          const userData = docSnap.data();
          setAuthorized(adminOnly ? userData.role === "admin" : true);
        }
      } catch (error) {
        console.error("ProtectedRoute auth check failed:", error);
        setAuthorized(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [adminOnly]);

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#555" }}>
        Checking access...
      </div>
    );
  }

  if (!authorized) return <Navigate to="/" />;

  return children;
}

export default ProtectedRoute;