import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { ADMIN_EMAIL } from "../constants";
import StatusBadge from "../components/StatusBadge";

function CompletedOrders() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        navigate("/");
        return;
      }
      const q = query(collection(db, "orders"), where("status", "==", "Delivered"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOrders(list);
    });
    return () => unsubscribe();
  }, [navigate]);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div style={{ padding: "40px" }}>
      <h1>Completed Orders ✅</h1>

      {orders.length > 0 && (
        <div style={{
          background: "#e8f5e9",
          padding: "16px 20px",
          borderRadius: "10px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span><strong>{orders.length}</strong> delivered orders</span>
          <span style={{ fontWeight: "bold", color: "#2E7D32" }}>
            Total: ₹ {totalRevenue}
          </span>
        </div>
      )}

      {orders.length === 0 ? (
        <p>No completed orders yet.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={{
            background: "#fff",
            padding: "20px",
            marginBottom: "16px",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}>
            <div>
              <p><strong>User:</strong> {order.userEmail}</p>
              <p><strong>Total:</strong> ₹ {order.total}</p>
              {order.createdAt && (
                <p style={{ color: "#888", fontSize: "13px" }}>
                  {order.createdAt.toDate().toLocaleString()}
                </p>
              )}
            </div>
            <StatusBadge status={order.status} />
          </div>
        ))
      )}
    </div>
  );
}

export default CompletedOrders;