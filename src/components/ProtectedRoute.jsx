import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, adminOnly }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const user = auth.currentUser;

      if (!user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setAuthorized(false);
      } else {
        const userData = docSnap.data();

        if (adminOnly) {
          setAuthorized(userData.role === "admin");
        } else {
          setAuthorized(true);
        }
      }

      setLoading(false);
    };

    checkUser();
  }, [adminOnly]);

  if (loading) return <p>Loading...</p>;

  if (!authorized) return <Navigate to="/" />;

  return children;
}

export default ProtectedRoute;