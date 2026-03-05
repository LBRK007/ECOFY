import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Profile() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  /* ===============================
     🔐 Authentication Check
  =============================== */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);
      fetchOrders(currentUser.uid);
    });

    return () => unsubscribe();
  }, [navigate]);

  /* ===============================
     📦 Fetch User Orders
  =============================== */
  const fetchOrders = async (uid) => {
    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc") // Latest first
      );

      const querySnapshot = await getDocs(q);

      const userOrders = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setOrders(userOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  /* ===============================
     🚪 Logout
  =============================== */
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (!user) return null;

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
      {/* ===== Profile Header ===== */}
      <div style={headerStyle}>
        <h1>My Profile 👤</h1>

        <button onClick={handleLogout} style={logoutBtn}>
          Logout
        </button>
      </div>

      {/* ===== User Info ===== */}
      <div style={cardStyle}>
        <h3>Email</h3>
        <p>{user.email}</p>
      </div>

      {/* ===== Order History ===== */}
      <h2 style={{ marginTop: "40px" }}>Order History 📦</h2>

      {orders.length === 0 ? (
        <p>You have no orders yet.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={orderCard}>
            <div style={orderTop}>
              <div>
                <p><strong>Total:</strong> ₹ {order.total}</p>
                <p>
                  <strong>Date:</strong>{" "}
                  {order.createdAt?.toDate().toLocaleString()}
                </p>
              </div>

              <StatusBadge status={order.status || "Pending"} />
            </div>

            {/* Items */}
            <div style={{ marginTop: "10px" }}>
              <strong>Items:</strong>
              {order.items?.map((item, index) => (
                <p key={index}>
                  {item.name} × {item.quantity}
                </p>
              ))}
            </div>

            {/* Shipping */}
            <div style={shippingBox}>
              <h4>Shipping Address</h4>
              <p>{order.shipping?.fullName}</p>
              <p>{order.shipping?.address}</p>
              <p>
                {order.shipping?.city}, {order.shipping?.state}
              </p>
              <p>PIN: {order.shipping?.pin}</p>
            </div>
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
  alignItems: "center"
};

const logoutBtn = {
  padding: "8px 14px",
  background: "#f44336",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer"
};

const cardStyle = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  marginTop: "20px",
  boxShadow: "0 6px 15px rgba(0,0,0,0.05)"
};

const orderCard = {
  background: "#fff",
  padding: "20px",
  marginTop: "20px",
  borderRadius: "12px",
  boxShadow: "0 6px 15px rgba(0,0,0,0.05)"
};

const orderTop = {
  display: "flex",
  justifyContent: "space-between"
};

const shippingBox = {
  marginTop: "15px",
  background: "#f9f9f9",
  padding: "10px",
  borderRadius: "8px"
};

const StatusBadge = ({ status }) => {
  const colors = {
    Pending: "#ff9800",
    Shipped: "#2196F3",
    Delivered: "#4CAF50",
    Cancelled: "#f44336"
  };

  return (
    <span
      style={{
        background: colors[status] || "#999",
        color: "white",
        padding: "6px 12px",
        borderRadius: "20px",
        fontSize: "14px"
      }}
    >
      {status}
    </span>
  );
};

export default Profile;