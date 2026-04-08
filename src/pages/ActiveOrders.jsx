import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ADMIN_EMAIL } from "../constants";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../hooks/useToast";

function ActiveOrders() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const { toast, ToastContainer } = useToast();
  const navigate = useNavigate();
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    const subscribeToOrders = () => {
      if (unsubscribeRef.current) unsubscribeRef.current();

      const q = query(collection(db, "orders"), orderBy("createdAt", "asc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setActiveOrders(all.filter((o) => o.status !== "Delivered"));
        },
        (err) => {
          console.error("Snapshot error:", err);
          toast("Lost connection to live orders.", "error");
        }
      );

      unsubscribeRef.current = unsubscribe;
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { navigate("/login"); return; }
      if (user.email !== ADMIN_EMAIL) {
        toast("Access Denied", "error");
        navigate("/");
        return;
      }
      subscribeToOrders();
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [navigate, toast]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      toast("Status updated ✅", "success");
    } catch (err) {
      console.error(err);
      toast("Failed to update status.", "error");
    }
    setUpdatingId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ padding: "40px", background: "#f4f6f8", minHeight: "100vh" }}
    >
      <ToastContainer />
      <h1>Active Orders</h1>
      {activeOrders.length === 0 ? (
        <p style={{ color: "#888" }}>No active orders right now.</p>
      ) : (
        activeOrders.map((order) => (
          <motion.div key={order.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={styles.orderCard}>
            <div style={styles.orderTop}>
              <div>
                <p><strong>User:</strong> {order.userEmail}</p>
                <p><strong>Total:</strong> ₹ {order.total}</p>
                <p style={{ fontSize: "13px", color: "#888" }}>{order.createdAt?.toDate().toLocaleString()}</p>
              </div>
              <StatusBadge status={order.status || "Pending"} />
            </div>

            {/* Shipping */}
            <div style={styles.shippingBox}>
              <p style={{ fontWeight: "500", fontSize: "13px" }}>Shipping details</p>
              <p style={styles.shippingText}>{order.shipping?.fullName}</p>
              <p style={styles.shippingText}>{order.shipping?.address}</p>
              <p style={styles.shippingText}>{order.shipping?.city}, {order.shipping?.state} — {order.shipping?.pin}</p>
              <p style={styles.shippingText}>📞 {order.shipping?.phone}</p>
            </div>

            {/* Items */}
            <div style={{ marginTop: "12px" }}>
              <p style={{ fontWeight: "500", fontSize: "13px" }}>Items</p>
              {order.items?.map((item, idx) => (
                <div key={idx} style={styles.itemRow}>
                  <span>{item.name}</span>
                  <span style={{ color: "#888" }}>× {item.quantity}</span>
                  <span style={{ marginLeft: "auto", color: "#2E7D32", fontWeight: "500" }}>₹ {item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Status dropdown */}
            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={order.status || "Pending"}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                disabled={updatingId === order.id}
                style={styles.select}
              >
                <option value="Pending">Pending</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              {updatingId === order.id && <span style={{ fontSize: "13px", color: "#888" }}>Saving...</span>}
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}

const styles = {
  orderCard: { background: "#fff", padding: "20px", marginBottom: "16px", borderRadius: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  orderTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" },
  shippingBox: { marginTop: "14px", background: "#f9f9f9", padding: "12px 14px", borderRadius: "8px" },
  shippingText: { margin: "2px 0", fontSize: "13px", color: "#555" },
  itemRow: { display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: "13px" },
  select: { padding: "8px 12px", borderRadius: "7px", border: "1px solid #ddd", fontSize: "14px", background: "#fff", cursor: "pointer" },
};

export default ActiveOrders;

