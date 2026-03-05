import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Admin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const ADMIN_EMAIL = "irfanmk@gmail.com";

  /* ===============================
     🔄 Fetch Orders
  =============================== */
  const fetchOrders = async () => {
    try {
      const q = query(
        collection(db, "orders"),
        orderBy("createdAt", "asc") // Oldest first
      );

      const querySnapshot = await getDocs(q);

      const ordersList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Hide Delivered orders
      const activeOrders = ordersList.filter(
        (order) => order.status !== "Delivered"
      );

      setOrders(activeOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }

    setLoading(false);
  };

  /* ===============================
     🔐 Admin Authentication
  =============================== */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      if (currentUser.email !== ADMIN_EMAIL) {
        alert("Access Denied ❌");
        navigate("/");
        return;
      }

      fetchOrders();
    });

    return () => unsubscribe();
  }, [navigate]);

  /* ===============================
     🔥 Update Order Status
  =============================== */
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>Loading Dashboard...</h2>
      </div>
    );
  }

  /* ===============================
     🎨 UI
  =============================== */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        padding: "40px",
        background: "#f4f6f8",
        minHeight: "100vh"
      }}
    >
      {/* ===== Header ===== */}
      <div style={headerStyle}>
        <h1 style={{ margin: 0 }}>Admin Dashboard 🌿</h1>

        <div style={{ display: "flex", gap: "15px" }}>
          <button
            onClick={() => navigate("/adminproducts")}
            style={buttonGreen}
          >
            Manage Products
          </button>

          <button
            onClick={() => navigate("/completed-orders")}
            style={buttonBlue}
          >
            Completed Orders
          </button>
        </div>
      </div>

      {/* ===== Summary Cards ===== */}
      <div style={summaryGrid}>
        <SummaryCard title="Total Orders" value={orders.length} />

        <SummaryCard
          title="Pending Orders"
          value={orders.filter((o) => o.status === "Pending").length}
        />

        <SummaryCard
          title="Total Revenue"
          value={`₹ ${orders.reduce(
            (sum, o) => sum + (o.total || 0),
            0
          )}`}
        />
      </div>

      {/* ===== Orders Section ===== */}
      <h2 style={{ marginBottom: "20px" }}>Active Orders</h2>

      {orders.length === 0 ? (
        <p>No active orders.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={orderCard}>
            <div style={orderTopSection}>
              <div>
                <p><strong>User:</strong> {order.userEmail}</p>
                <p><strong>Total:</strong> ₹ {order.total}</p>
                <p>
                  <strong>Date:</strong>{" "}
                  {order.createdAt?.toDate().toLocaleString()}
                </p>
              </div>

              <StatusBadge status={order.status || "Pending"} />
            </div>

            {/* Shipping Info */}
            <div style={shippingBox}>
              <h4>Shipping Details</h4>
              <p>{order.shipping?.fullName}</p>
              <p>{order.shipping?.address}</p>
              <p>
                {order.shipping?.city},{" "}
                {order.shipping?.state}
              </p>
              <p>PIN: {order.shipping?.pin}</p>
              <p>Phone: {order.shipping?.phone}</p>
            </div>

            {/* Status Dropdown */}
            <select
              value={order.status || "Pending"}
              onChange={(e) =>
                handleStatusChange(order.id, e.target.value)
              }
              style={selectStyle}
            >
              <option value="Pending">Pending</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        ))
      )}
    </motion.div>
  );
}

/* ===============================
   🎨 Styles
=============================== */

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "30px"
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "20px",
  marginBottom: "40px"
};

const orderCard = {
  background: "#fff",
  padding: "20px",
  marginBottom: "20px",
  borderRadius: "12px",
  boxShadow: "0 6px 15px rgba(0,0,0,0.05)"
};

const orderTopSection = {
  display: "flex",
  justifyContent: "space-between"
};

const shippingBox = {
  marginTop: "15px",
  background: "#f9f9f9",
  padding: "10px",
  borderRadius: "8px"
};

const selectStyle = {
  marginTop: "15px",
  padding: "8px",
  borderRadius: "6px"
};

const buttonGreen = {
  padding: "10px 15px",
  backgroundColor: "#4CAF50",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer"
};

const buttonBlue = {
  padding: "10px 15px",
  backgroundColor: "#2196F3",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer"
};

/* ===============================
   📊 Components
=============================== */

const SummaryCard = ({ title, value }) => (
  <div style={{
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 6px 15px rgba(0,0,0,0.05)"
  }}>
    <h4>{title}</h4>
    <h2>{value}</h2>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = {
    Pending: "#ff9800",
    Shipped: "#2196F3",
    Delivered: "#4CAF50",
    Cancelled: "#f44336"
  };

  return (
    <span style={{
      background: colors[status] || "#999",
      color: "white",
      padding: "6px 12px",
      borderRadius: "20px",
      fontSize: "14px"
    }}>
      {status}
    </span>
  );
};

export default Admin;