import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { motion } from "framer-motion";
import StatusBadge from "../components/StatusBadge";

export default function UserOrderHistory() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const unsubSnapshot = onSnapshot(q, (snapshot) => {
        const allOrders = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          };
        });

        const userOrders = allOrders.filter(o => o.userEmail === user.email);
        setOrders(userOrders);
      });

      return () => unsubSnapshot();
    });

    return () => unsubAuth();
  }, []);

  return (
    <motion.div
      style={{ padding: "20px", minHeight: "100vh", background: "#f4f6f8" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h1>Your Order History</h1>
      {orders.length === 0 ? (
        <p style={{ color: "#888" }}>No orders yet.</p>
      ) : (
        orders.map(order => (
          <motion.div
            key={order.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "#fff",
              padding: "20px",
              marginBottom: "16px",
              borderRadius: "14px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <p><strong>Date:</strong> {order.createdAt.toLocaleString()}</p>
                <p><strong>Total:</strong> ₹ {order.total}</p>
              </div>
              <StatusBadge status={order.status || "Pending"} />
            </div>

            {/* Shipping */}
            <div style={{ marginTop: "12px", background: "#f9f9f9", padding: "12px 14px", borderRadius: "8px" }}>
              <p style={{ fontWeight: "500", fontSize: "13px" }}>Shipping Details</p>
              <p>{order.shipping?.fullName}</p>
              <p>{order.shipping?.address}</p>
              <p>{order.shipping?.city}, {order.shipping?.state} — {order.shipping?.pin}</p>
              <p>📞 {order.shipping?.phone}</p>
            </div>

            {/* Items */}
            <div style={{ marginTop: "12px" }}>
              <p style={{ fontWeight: "500", fontSize: "13px" }}>Items</p>
              {order.items?.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: "8px", padding: "5px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: "13px" }}>
                  <span>{item.name}</span>
                  <span style={{ color: "#888" }}>× {item.quantity}</span>
                  <span style={{ marginLeft: "auto", color: "#2E7D32", fontWeight: "500" }}>₹ {item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}
