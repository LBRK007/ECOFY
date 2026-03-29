import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ADMIN_EMAIL } from "../constants";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../hooks/useToast";
import OrdersChart from "../components/OrdersChart";

function Admin() {
  const [allOrders, setAllOrders]   = useState([]); // every order (for chart + completed count)
  const [activeOrders, setActiveOrders] = useState([]); // non-Delivered (for the orders table)
  const [loading, setLoading]       = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const { toast, ToastContainer }   = useToast();
  const navigate = useNavigate();
  const unsubscribeSnapshotRef      = useRef(null);

/* ── Auth guard + real-time listener ── */
useEffect(() => {
  const subscribeToOrders = () => {
    if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();

    const q = query(collection(db, "orders"), orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllOrders(all);
        setActiveOrders(all.filter((o) => o.status !== "Delivered"));
        setLoading(false);
      },
      (error) => {
        console.error("Snapshot error:", error);
        toast("Lost connection to live orders.", "error");
        setLoading(false);
      }
    );

    unsubscribeSnapshotRef.current = unsubscribe;
  };

  const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
    if (!currentUser) { navigate("/login"); return; }
    if (currentUser.email !== ADMIN_EMAIL) {
      toast("Access Denied", "error");
      navigate("/");
      return;
    }
    subscribeToOrders();
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
  };
}, [navigate, toast]);

  /* ── Update order status ── */
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      // onSnapshot handles the re-render automatically
      toast("Status updated ✅", "success");
    } catch (err) {
      console.error("Update error:", err);
      toast("Failed to update status.", "error");
    }
    setUpdatingId(null);
  };

  if (loading) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>Connecting to live dashboard...</h2>
      </div>
    );
  }

  /* Revenue: exclude cancelled */
  const activeRevenue = allOrders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ padding: "40px", background: "#f4f6f8", minHeight: "100vh" }}
    >
      <ToastContainer />

      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Dashboard 🌿</h1>
          <div style={styles.liveIndicator}>
            <span style={styles.liveDot} />
            Live updates active
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/adminproducts")} style={styles.btnGreen}>
            Manage Products
          </button>
          <button onClick={() => navigate("/completed-orders")} style={styles.btnBlue}>
            Completed Orders
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={styles.summaryGrid}>
        <SummaryCard
          title="Active Orders"
          value={activeOrders.length}
          sub="non-delivered"
        />
        <SummaryCard
          title="Pending"
          value={activeOrders.filter((o) => o.status === "Pending").length}
          sub="awaiting action"
        />
        <SummaryCard
          title="Completed"
          value={allOrders.filter((o) => o.status === "Delivered").length}
          sub="delivered"
        />
        <SummaryCard
          title="Revenue"
          value={`₹ ${activeRevenue.toLocaleString("en-IN")}`}
          sub="excl. cancelled"
        />
      </div>

      {/* ── Analytics Chart ── */}
      <OrdersChart orders={activeOrders} allOrders={allOrders} />

      {/* ── Active Orders table ── */}
      <h2 style={{ marginBottom: "20px" }}>Active Orders</h2>

      {activeOrders.length === 0 ? (
        <p style={{ color: "#888" }}>No active orders right now.</p>
      ) : (
        activeOrders.map((order) => (
          <motion.div
            key={order.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.orderCard}
          >
            <div style={styles.orderTop}>
              <div>
                <p style={{ margin: "0 0 4px" }}>
                  <strong>User:</strong> {order.userEmail}
                </p>
                <p style={{ margin: "0 0 4px" }}>
                  <strong>Total:</strong> ₹ {order.total}
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                  {order.createdAt?.toDate().toLocaleString()}
                </p>
              </div>
              <StatusBadge status={order.status || "Pending"} />
            </div>

            {/* Shipping */}
            <div style={styles.shippingBox}>
              <p style={{ margin: "0 0 4px", fontWeight: "500", fontSize: "13px" }}>
                Shipping details
              </p>
              <p style={styles.shippingText}>{order.shipping?.fullName}</p>
              <p style={styles.shippingText}>{order.shipping?.address}</p>
              <p style={styles.shippingText}>
                {order.shipping?.city}, {order.shipping?.state} — {order.shipping?.pin}
              </p>
              <p style={styles.shippingText}>📞 {order.shipping?.phone}</p>
            </div>

            {/* Items */}
            <div style={{ marginTop: "12px" }}>
              <p style={{ margin: "0 0 6px", fontWeight: "500", fontSize: "13px" }}>Items</p>
              {order.items?.map((item, idx) => (
                <div key={idx} style={styles.itemRow}>
                  <span>{item.name}</span>
                  <span style={{ color: "#888" }}>× {item.quantity}</span>
                  <span style={{ marginLeft: "auto", color: "#2E7D32", fontWeight: "500" }}>
                    ₹ {item.price * item.quantity}
                  </span>
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
              {updatingId === order.id && (
                <span style={{ fontSize: "13px", color: "#888" }}>Saving...</span>
              )}
            </div>
          </motion.div>
        ))
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </motion.div>
  );
}

/* ── Sub-components ── */
const SummaryCard = ({ title, value, sub }) => (
  <div style={{
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  }}>
    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: ".04em" }}>
      {title}
    </p>
    <h2 style={{ margin: "0 0 2px" }}>{value}</h2>
    {sub && <p style={{ margin: 0, fontSize: "12px", color: "#bbb" }}>{sub}</p>}
  </div>
);

/* ── Styles ── */
const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "16px",
  },
  liveIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#4CAF50",
    marginTop: "6px",
    fontWeight: "500",
  },
  liveDot: {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#4CAF50",
    animation: "pulse 1.8s ease-in-out infinite",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "30px",
  },
  orderCard: {
    background: "#fff",
    padding: "20px",
    marginBottom: "16px",
    borderRadius: "14px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  orderTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "10px",
  },
  shippingBox: {
    marginTop: "14px",
    background: "#f9f9f9",
    padding: "12px 14px",
    borderRadius: "8px",
  },
  shippingText: { margin: "2px 0", fontSize: "13px", color: "#555" },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "5px 0",
    borderBottom: "0.5px solid #f0f0f0",
    fontSize: "13px",
  },
  select: {
    padding: "8px 12px",
    borderRadius: "7px",
    border: "1px solid #ddd",
    fontSize: "14px",
    background: "#fff",
    cursor: "pointer",
  },
  btnGreen: {
    padding: "10px 16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
  },
  btnBlue: {
    padding: "10px 16px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
  },
};

export default Admin;