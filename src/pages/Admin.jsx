import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Admin() {

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const ADMIN_EMAIL = "irfanmk@gmail.com"; // your admin email

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {

      if (!currentUser) {
        navigate("/login");
        return;
      }

      if (currentUser.email !== ADMIN_EMAIL) {
        alert("Access Denied ❌");
        navigate("/");
        return;
      }

      try {
        const querySnapshot = await getDocs(collection(db, "orders"));

        const ordersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setOrders(ordersList);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }

      setLoading(false);
    });

    return () => unsubscribe();

  }, [navigate]);

  if (loading) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>Loading Dashboard...</h2>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ padding: "40px" }}
    >
      <h1>Admin Dashboard 🌿</h1>

      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        orders.map(order => (
          <div
            key={order.id}
            style={{
              background: "#fff",
              padding: "20px",
              marginBottom: "20px",
              borderRadius: "10px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
            }}
          >
            <p><strong>User:</strong> {order.userEmail}</p>
            <p><strong>Total:</strong> ₹ {order.total}</p>
            <p><strong>Items:</strong> {order.items.length}</p>
            <p>
              <strong>Date:</strong>{" "}
              {order.createdAt?.toDate().toLocaleString()}
            </p>
          </div>
        ))
      )}
    </motion.div>
  );
}

export default Admin;